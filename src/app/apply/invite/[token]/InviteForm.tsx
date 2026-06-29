"use client";

import { useEffect, useMemo, useState } from "react";
import AddressAutocomplete from "../../AddressAutocomplete";
import AddressLivedDates from "../../AddressLivedDates";
import PhoneField from "../../PhoneField";
import StepDocumentUpload from "../../StepDocumentUpload";
import {
  InviteContext,
  InviteeSubmitPayload,
  MemberDocument,
  fetchInvite,
  submitInvite,
} from "@/lib/api";
import { IdDocumentKind, idUploadComplete } from "@/lib/documentUpload";
import { Locale, MessageKey, detectLocale, t } from "@/lib/i18n";
import {
  addressDatePayload,
  formatAddressDateRange,
  toAddressValidationInput,
} from "@/lib/addressFormUtils";
import {
  ApplyValidationCode,
  addressFieldErrors,
  validatePhoneFormat,
  validatePhones,
} from "@/lib/applyValidation";
import {
  InviteeFieldErrors,
  InviteeFormFields,
  InviteeRole,
  firstInviteeErrorKey,
  inviteeFieldErrors,
} from "@/lib/inviteValidation";
import { mapInviteServerSubmitError } from "@/lib/serverSubmitErrors";

type Step = "personal" | "addresses" | "housing" | "references" | "other" | "review" | "done";

const ROOMMATE_STEPS: Step[] = [
  "personal",
  "addresses",
  "housing",
  "references",
  "other",
  "review",
];
const GUARANTOR_STEPS: Step[] = ["personal", "addresses", "references", "review"];

const VALIDATION_MESSAGE: Record<
  ApplyValidationCode | "invite_email_mismatch",
  MessageKey
> = {
  move_in_too_soon: "validationMoveInTooSoon",
  move_in_before_available: "validationMoveInBeforeAvailable",
  invalid_email: "validationInvalidEmail",
  duplicate_email: "validationDuplicateEmail",
  landlord_hr_same_phone: "validationLandlordHrSamePhone",
  invalid_phone: "validationInvalidPhone",
  required: "fieldRequired",
  address_date_required: "validationAddressDateRequired",
  invalid_address_date_range: "validationInvalidAddressDateRange",
  address_date_in_future: "validationAddressDateInFuture",
  address_dates_chain: "validationAddressDatesChain",
  invite_email_mismatch: "validationInviteEmailMismatch",
};

function splitInvitedName(name: string | null): {
  given_name: string;
  family_name: string;
} {
  if (!name?.trim()) return { given_name: "", family_name: "" };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { given_name: parts[0], family_name: "" };
  return { given_name: parts[0], family_name: parts.slice(1).join(" ") };
}

function emptyFields(): InviteeFormFields {
  return {
    given_name: "",
    family_name: "",
    date_of_birth: "",
    email: "",
    phone: "",
    current_address: "",
    current_place_id: "",
    address_not_in_canada: false,
    previous_address: "",
    previous_place_id: "",
    current_address_lived_from: "",
    current_address_lived_to: "",
    still_at_current_address: true,
    previous_address_lived_from: "",
    previous_address_lived_to: "",
    lease_in_name: null,
    move_in_date: "",
    landlord_name: "",
    landlord_phone: "",
    hr_name: "",
    hr_phone: "",
    referral_source: "",
    facebook_url: "",
    linkedin_url: "",
  };
}

function stepLabel(locale: Locale, step: Step): string {
  const map: Record<Step, MessageKey> = {
    personal: "stepPersonal",
    addresses: "stepAddresses",
    housing: "stepHousing",
    references: "stepReferences",
    other: "stepOther",
    review: "stepReview",
    done: "successTitle",
  };
  return t(locale, map[step]);
}

type Props = { token: string };

export default function InviteForm({ token }: Props) {
  const [locale, setLocale] = useState<Locale>("fr");
  const [context, setContext] = useState<InviteContext | null>(null);
  const [step, setStep] = useState<Step>("personal");
  const [form, setForm] = useState<InviteeFormFields>(emptyFields);
  const [fieldErrors, setFieldErrors] = useState<InviteeFieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idKind, setIdKind] = useState<IdDocumentKind>("passport");
  const [idDocuments, setIdDocuments] = useState<MemberDocument[]>([]);

  const inputClass =
    "mt-1 w-full rounded border border-[#e7e0d5] bg-white px-3 py-2.5 text-base text-[#292524] outline-none transition focus:border-[#3d5a45]";

  const inputClassFor = (fieldKey: string) =>
    fieldErrors[fieldKey]
      ? `${inputClass} border-[#e7a4a4] focus:border-[#b91c1c]`
      : inputClass;

  const role: InviteeRole | null =
    context?.role === "roommate" || context?.role === "guarantor"
      ? context.role
      : null;

  const steps = useMemo(
    () => (role === "guarantor" ? GUARANTOR_STEPS : ROOMMATE_STEPS),
    [role]
  );

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchInvite(token)
      .then((data) => {
        if (cancelled) return;
        setContext(data);
        if (data.member_status === "submitted") {
          setStep("done");
          return;
        }
        const names = splitInvitedName(data.invited_name);
        setForm((prev) => ({
          ...prev,
          given_name: names.given_name,
          family_name: names.family_name,
          email: data.invited_email || "",
          phone: data.invited_phone || "",
          move_in_date: data.move_in_date || "",
        }));
      })
      .catch(() => {
        if (!cancelled) setError(t(locale, "inviteExpired"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, locale]);

  const setField = <K extends keyof InviteeFormFields>(
    key: K,
    value: InviteeFormFields[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const fieldHint = (key: string) => {
    const code = fieldErrors[key];
    if (!code) return null;
    if (code === "required") {
      return (
        <p className="mt-1 text-sm text-[#b91c1c]" role="alert">
          {t(locale, "fieldRequired")}
        </p>
      );
    }
    return (
      <p className="mt-1 text-sm text-[#b91c1c]" role="alert">
        {t(locale, VALIDATION_MESSAGE[code])}
      </p>
    );
  };

  const addressFields = () =>
    toAddressValidationInput(form, { requireLeaseInName: role === "roommate" });

  const validateStep = (current: Step): boolean => {
    if (!role || !context) return false;
    const keysForStep: Record<Step, (keyof InviteeFormFields)[]> = {
      personal: ["given_name", "family_name", "date_of_birth", "email", "phone"],
      addresses: [],
      housing: role === "roommate" ? ["move_in_date"] : [],
      references:
        role === "guarantor"
          ? ["hr_name", "hr_phone"]
          : ["landlord_name", "landlord_phone", "hr_name", "hr_phone"],
      other: [],
      review: [],
      done: [],
    };
    const errors: InviteeFieldErrors = {};
    for (const key of keysForStep[current]) {
      const value = form[key];
      if (value === null || value === undefined || String(value).trim() === "") {
        errors[key] = "required";
      }
    }
    if (current === "personal" && context.invited_email) {
      const email = form.email.trim().toLowerCase();
      if (email !== context.invited_email.trim().toLowerCase()) {
        errors.email = "invite_email_mismatch";
      }
    }
    if (current === "personal") {
      const phoneError = validatePhoneFormat(form.phone);
      if (phoneError) errors.phone = phoneError;
    }
    if (current === "addresses") {
      Object.assign(errors, addressFieldErrors(addressFields()));
    }
    if (current === "references") {
      if (role === "guarantor") {
        const hrError = validatePhoneFormat(form.hr_phone);
        if (hrError) errors.hr_phone = hrError;
      } else {
        const phoneError = validatePhones(form.landlord_phone, form.hr_phone);
        if (phoneError) {
          errors.landlord_phone = phoneError;
          errors.hr_phone = phoneError;
        }
      }
    }
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return false;
    }
    if (
      current === "personal" &&
      context.upload_token &&
      !idUploadComplete(
        idKind,
        idDocuments.map((doc) => doc.document_type)
      )
    ) {
      setError(t(locale, "idUploadRequired"));
      return false;
    }
    return true;
  };

  const continueTo = (next: Step) => {
    if (!validateStep(step)) return;
    setError(null);
    setStep(next);
  };

  const goToStep = (target: Step) => {
    if (!role) return;
    setError(null);
    const currentIdx = steps.indexOf(step);
    const targetIdx = steps.indexOf(target);
    if (targetIdx < 0) return;
    if (targetIdx > currentIdx) {
      for (let i = currentIdx; i < targetIdx; i++) {
        const stepToValidate = steps[i];
        if (!validateStep(stepToValidate)) {
          setStep(stepToValidate);
          return;
        }
      }
    }
    setFieldErrors({});
    setStep(target);
  };

  const handleSubmit = async () => {
    if (!role || !context) return;
    if (
      context.upload_token &&
      !idUploadComplete(
        idKind,
        idDocuments.map((doc) => doc.document_type)
      )
    ) {
      setError(t(locale, "idUploadRequired"));
      setStep("personal");
      return;
    }
    const errors = inviteeFieldErrors(role, form, context.invited_email || "");
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      const key = firstInviteeErrorKey(errors);
      if (key) {
        if (["given_name", "family_name", "date_of_birth", "email", "phone"].includes(key)) {
          setStep("personal");
        } else if (
          key === "current_address" ||
          key === "lease_in_name" ||
          key.includes("address_lived")
        ) {
          setStep("addresses");
        } else if (key.startsWith("landlord") || key.startsWith("hr")) {
          setStep("references");
        } else if (key === "move_in_date") {
          setStep("housing");
        }
      }
      return;
    }

    const payload: InviteeSubmitPayload = {
      given_name: form.given_name.trim(),
      family_name: form.family_name.trim(),
      date_of_birth: form.date_of_birth,
      email: form.email.trim(),
      phone: form.phone.trim(),
      current_address: form.current_address.trim(),
      ...addressDatePayload(form),
    };
    if (form.address_not_in_canada) {
      payload.address_not_in_canada = true;
    } else if (form.current_place_id) {
      payload.current_place_id = form.current_place_id;
    }
    if (form.previous_address.trim()) {
      payload.previous_address = form.previous_address.trim();
    }
    if (form.previous_place_id) payload.previous_place_id = form.previous_place_id;

    if (role === "roommate") {
      payload.lease_in_name = form.lease_in_name === true;
      payload.move_in_date = form.move_in_date;
      payload.landlord_name = form.landlord_name.trim();
      payload.landlord_phone = form.landlord_phone.trim();
      payload.hr_name = form.hr_name.trim();
      payload.hr_phone = form.hr_phone.trim();
      if (form.referral_source.trim()) payload.referral_source = form.referral_source.trim();
      if (form.facebook_url.trim()) payload.facebook_url = form.facebook_url.trim();
      if (form.linkedin_url.trim()) payload.linkedin_url = form.linkedin_url.trim();
    } else {
      payload.hr_name = form.hr_name.trim();
      payload.hr_phone = form.hr_phone.trim();
    }

    setSubmitting(true);
    setError(null);
    try {
      await submitInvite(token, payload);
      setStep("done");
    } catch (e) {
      const message = e instanceof Error ? e.message : t(locale, "error");
      const mapped = mapInviteServerSubmitError(message, role, form);
      if (mapped) {
        setFieldErrors(mapped.fieldErrors);
        setError(t(locale, mapped.messageKey));
        setStep(mapped.step);
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[#78716c]">{t(locale, "loading")}</p>;
  }

  if (error && !context) {
    return (
      <p className="rounded border border-[#e7c4c4] bg-[#fdf5f5] px-4 py-3 text-sm text-[#7f1d1d]">
        {error}
      </p>
    );
  }

  if (!context || !role) {
    return (
      <p className="text-sm text-[#78716c]">{t(locale, "inviteExpired")}</p>
    );
  }

  const title =
    role === "guarantor"
      ? t(locale, "inviteTitleGuarantor")
      : t(locale, "inviteTitleRoommate");

  const subtitle = t(locale, "inviteSubtitle")
    .replace("{primary}", context.primary_name)
    .replace("{building}", context.building_name)
    .replace("{unit}", context.unit_number);

  if (step === "done") {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold text-[#292524]">
          {t(locale, "inviteSuccessTitle")}
        </h1>
        <p className="text-sm text-[#57534e]">{t(locale, "inviteSuccessBody")}</p>
        <p className="text-sm text-[#78716c]">
          {t(locale, "applicationId")}: #{context.application_id}
        </p>
      </div>
    );
  }

  const stepIndex = steps.indexOf(step);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-[#292524]">{title}</h1>
          <p className="mt-1 text-sm text-[#78716c]">{subtitle}</p>
          <p className="mt-1 text-sm text-[#78716c]">
            {context.building_address}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
          className="shrink-0 text-sm text-[#57534e] underline-offset-2 hover:underline"
        >
          {t(locale, "langToggle")}
        </button>
      </div>

      <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs text-[#78716c]" aria-label="Invite form steps">
        {steps.map((s, i) => (
          <span key={s} className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToStep(s)}
              aria-current={i === stepIndex ? "step" : undefined}
              className={`rounded px-1 py-0.5 underline-offset-2 hover:underline ${
                i === stepIndex ? "font-medium text-[#3d5a45]" : "text-[#78716c]"
              }`}
            >
              {stepLabel(locale, s)}
            </button>
            {i < steps.length - 1 ? <span aria-hidden>·</span> : null}
          </span>
        ))}
      </nav>

      {error && (
        <p className="mb-4 rounded border border-[#e7c4c4] bg-[#fdf5f5] px-3 py-2 text-sm text-[#7f1d1d]">
          {error}
        </p>
      )}

      {step === "personal" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            continueTo(steps[stepIndex + 1]);
          }}
        >
          <label className="block text-sm text-[#57534e]">
            {t(locale, "givenName")}
            <input
              required
              value={form.given_name}
              onChange={(e) => setField("given_name", e.target.value)}
              className={inputClass}
            />
            {fieldHint("given_name")}
          </label>
          <label className="block text-sm text-[#57534e]">
            {t(locale, "familyName")}
            <input
              required
              value={form.family_name}
              onChange={(e) => setField("family_name", e.target.value)}
              className={inputClass}
            />
            {fieldHint("family_name")}
          </label>
          <label className="block text-sm text-[#57534e]">
            {t(locale, "dateOfBirth")}
            <input
              type="date"
              required
              value={form.date_of_birth}
              onChange={(e) => setField("date_of_birth", e.target.value)}
              className={inputClass}
            />
            {fieldHint("date_of_birth")}
          </label>
          <label className="block text-sm text-[#57534e]">
            {t(locale, "email")}
            <input
              type="email"
              required
              readOnly={!!context.invited_email}
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              className={`${inputClass} ${context.invited_email ? "bg-[#faf8f4]" : ""}`}
            />
            {fieldHint("email")}
          </label>
          <div className="block text-sm text-[#57534e]">
            <span className="block">{t(locale, "phone")}</span>
            <PhoneField
              locale={locale}
              required
              invalid={!!fieldErrors.phone}
              value={form.phone}
              onChange={(value) => setField("phone", value)}
            />
            {fieldHint("phone")}
          </div>
          {context.upload_token ? (
            <StepDocumentUpload
              mode="member"
              locale={locale}
              applicationId={context.application_id}
              memberId={context.member_id}
              uploadToken={context.upload_token}
              idKind={idKind}
              onIdKindChange={setIdKind}
              onDocumentsChange={setIdDocuments}
            />
          ) : null}
          <button
            type="submit"
            className="rounded bg-[#3d5a45] px-4 py-2.5 text-sm font-medium text-white"
          >
            {t(locale, "continue")}
          </button>
        </form>
      )}

      {step === "addresses" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            continueTo(steps[stepIndex + 1]);
          }}
        >
          <label className="flex items-start gap-2 text-sm text-[#292524]">
            <input
              type="checkbox"
              checked={form.address_not_in_canada}
              onChange={(e) => {
                const checked = e.target.checked;
                setForm((prev) => ({
                  ...prev,
                  address_not_in_canada: checked,
                  current_place_id: checked ? "" : prev.current_place_id,
                }));
              }}
              className="mt-1"
            />
            <span>{t(locale, "addressNotInCanada")}</span>
          </label>
          <AddressAutocomplete
            locale={locale}
            label={t(locale, "currentAddress")}
            value={form.current_address}
            manualOnly={form.address_not_in_canada}
            onChange={(address, placeId) => {
              setField("current_address", address);
              if (!form.address_not_in_canada && placeId) {
                setField("current_place_id", placeId);
              }
            }}
            required
            inputClass={inputClass}
          />
          {fieldHint("current_address")}
          <AddressLivedDates
            locale={locale}
            prefix="current"
            livedFrom={form.current_address_lived_from}
            livedTo={form.current_address_lived_to}
            stillLivingHere={form.still_at_current_address}
            onLivedFromChange={(value) => setField("current_address_lived_from", value)}
            onLivedToChange={(value) => setField("current_address_lived_to", value)}
            onStillLivingChange={(checked) => {
              setForm((prev) => ({
                ...prev,
                still_at_current_address: checked,
                current_address_lived_to: checked ? "" : prev.current_address_lived_to,
              }));
            }}
            inputClassFor={inputClassFor}
            fieldHint={fieldHint}
          />
          {role === "roommate" && (
            <fieldset>
              <legend className="text-sm text-[#57534e]">
                {t(locale, "leaseInName")}
              </legend>
              <p className="mt-1 text-sm text-[#78716c]">
                {t(locale, "leaseInNameHint")}
              </p>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    required
                    checked={form.lease_in_name === true}
                    onChange={() => setField("lease_in_name", true)}
                  />
                  {t(locale, "yes")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={form.lease_in_name === false}
                    onChange={() => setField("lease_in_name", false)}
                  />
                  {t(locale, "no")}
                </label>
              </div>
              {fieldHint("lease_in_name")}
            </fieldset>
          )}
          <AddressAutocomplete
            locale={locale}
            label={t(locale, "previousAddress")}
            value={form.previous_address}
            onChange={(address, placeId) => {
              setField("previous_address", address);
              if (!address.trim()) {
                setForm((prev) => ({
                  ...prev,
                  previous_address_lived_from: "",
                  previous_address_lived_to: "",
                }));
              }
              if (placeId) setField("previous_place_id", placeId);
            }}
            inputClass={inputClass}
          />
          {form.previous_address.trim() ? (
            <AddressLivedDates
              locale={locale}
              prefix="previous"
              livedFrom={form.previous_address_lived_from}
              livedTo={form.previous_address_lived_to}
              onLivedFromChange={(value) =>
                setField("previous_address_lived_from", value)
              }
              onLivedToChange={(value) =>
                setField("previous_address_lived_to", value)
              }
              inputClassFor={inputClassFor}
              fieldHint={fieldHint}
            />
          ) : null}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(steps[stepIndex - 1])}
              className="text-sm text-[#57534e] underline-offset-2 hover:underline"
            >
              {t(locale, "previousStep")}
            </button>
            <button
              type="submit"
              className="rounded bg-[#3d5a45] px-4 py-2.5 text-sm font-medium text-white"
            >
              {t(locale, "continue")}
            </button>
          </div>
        </form>
      )}

      {step === "housing" && role === "roommate" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            continueTo(steps[stepIndex + 1]);
          }}
        >
          <label className="block text-sm text-[#57534e]">
            {t(locale, "moveInDate")}
            <input
              type="date"
              required
              value={form.move_in_date}
              onChange={(e) => setField("move_in_date", e.target.value)}
              className={inputClass}
            />
            {fieldHint("move_in_date")}
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(steps[stepIndex - 1])} className="text-sm text-[#57534e] underline-offset-2 hover:underline">
              {t(locale, "previousStep")}
            </button>
            <button type="submit" className="rounded bg-[#3d5a45] px-4 py-2.5 text-sm font-medium text-white">
              {t(locale, "continue")}
            </button>
          </div>
        </form>
      )}

      {step === "references" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            continueTo(steps[stepIndex + 1]);
          }}
        >
          <p className="text-sm text-[#78716c]">{t(locale, "referencesNote")}</p>
          {role === "roommate" && (
            <>
              <label className="block text-sm text-[#57534e]">
                {t(locale, "landlordName")}
                <input
                  required
                  value={form.landlord_name}
                  onChange={(e) => setField("landlord_name", e.target.value)}
                  className={inputClass}
                />
                {fieldHint("landlord_name")}
              </label>
              <div className="block text-sm text-[#57534e]">
                <span className="block">{t(locale, "landlordPhone")}</span>
                <PhoneField
                  locale={locale}
                  required
                  invalid={!!fieldErrors.landlord_phone}
                  value={form.landlord_phone}
                  onChange={(value) => setField("landlord_phone", value)}
                />
                {fieldHint("landlord_phone")}
              </div>
            </>
          )}
          <label className="block text-sm text-[#57534e]">
            {t(locale, "hrName")}
            <input
              required
              value={form.hr_name}
              onChange={(e) => setField("hr_name", e.target.value)}
              className={inputClass}
            />
            {fieldHint("hr_name")}
          </label>
          <div className="block text-sm text-[#57534e]">
            <span className="block">{t(locale, "hrPhone")}</span>
            <PhoneField
              locale={locale}
              required
              invalid={!!fieldErrors.hr_phone}
              value={form.hr_phone}
              onChange={(value) => setField("hr_phone", value)}
            />
            {fieldHint("hr_phone")}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(steps[stepIndex - 1])} className="text-sm text-[#57534e] underline-offset-2 hover:underline">
              {t(locale, "previousStep")}
            </button>
            <button type="submit" className="rounded bg-[#3d5a45] px-4 py-2.5 text-sm font-medium text-white">
              {t(locale, "continue")}
            </button>
          </div>
        </form>
      )}

      {step === "other" && role === "roommate" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            continueTo("review");
          }}
        >
          <label className="block text-sm text-[#57534e]">
            {t(locale, "referralSource")}
            <textarea
              value={form.referral_source}
              onChange={(e) => setField("referral_source", e.target.value)}
              rows={3}
              className={inputClass}
            />
          </label>
          <label className="block text-sm text-[#57534e]">
            {t(locale, "facebookUrl")}
            <input
              value={form.facebook_url}
              onChange={(e) => setField("facebook_url", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm text-[#57534e]">
            {t(locale, "linkedinUrl")}
            <input
              value={form.linkedin_url}
              onChange={(e) => setField("linkedin_url", e.target.value)}
              className={inputClass}
            />
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep("references")} className="text-sm text-[#57534e] underline-offset-2 hover:underline">
              {t(locale, "previousStep")}
            </button>
            <button type="submit" className="rounded bg-[#3d5a45] px-4 py-2.5 text-sm font-medium text-white">
              {t(locale, "continue")}
            </button>
          </div>
        </form>
      )}

      {step === "review" && (
        <div className="space-y-4">
          <p className="text-sm text-[#57534e]">{t(locale, "reviewNote")}</p>
          <dl className="space-y-2 text-sm text-[#292524]">
            <div>
              <dt className="text-xs uppercase text-[#a8a29e]">{t(locale, "givenName")}</dt>
              <dd>{form.given_name} {form.family_name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[#a8a29e]">{t(locale, "email")}</dt>
              <dd>{form.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[#a8a29e]">{t(locale, "currentAddress")}</dt>
              <dd>{form.current_address}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[#a8a29e]">{t(locale, "addressLivedHere")}</dt>
              <dd>
                {formatAddressDateRange(
                  locale,
                  form.current_address_lived_from,
                  form.still_at_current_address ? null : form.current_address_lived_to
                )}
              </dd>
            </div>
            {role === "roommate" && (
              <div>
                <dt className="text-xs uppercase text-[#a8a29e]">{t(locale, "leaseInName")}</dt>
                <dd>
                  {form.lease_in_name ? t(locale, "yes") : t(locale, "no")}
                </dd>
              </div>
            )}
            {form.previous_address.trim() && (
              <>
                <div>
                  <dt className="text-xs uppercase text-[#a8a29e]">{t(locale, "previousAddress")}</dt>
                  <dd>{form.previous_address}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-[#a8a29e]">{t(locale, "addressLivedHere")}</dt>
                  <dd>
                    {formatAddressDateRange(
                      locale,
                      form.previous_address_lived_from,
                      form.previous_address_lived_to
                    )}
                  </dd>
                </div>
              </>
            )}
          </dl>
          {error && (
            <p
              className="mb-4 rounded border border-[#e7c4c4] bg-[#fdf5f5] px-3 py-2 text-sm text-[#7f1d1d]"
              role="alert"
            >
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(steps[stepIndex - 1])}
              className="text-sm text-[#57534e] underline-offset-2 hover:underline"
            >
              {t(locale, "previousStep")}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="rounded bg-[#3d5a45] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {submitting ? t(locale, "loading") : t(locale, "submit")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
