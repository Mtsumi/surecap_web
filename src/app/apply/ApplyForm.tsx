"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AddressAutocomplete from "./AddressAutocomplete";
import {
  ApplicationSubmit,
  Building,
  GuarantorContact,
  RoommateContact,
  Unit,
  fetchBuildings,
  fetchUnits,
  submitApplication,
} from "@/lib/api";
import {
  clearApplyProgress,
  loadApplyProgress,
  saveApplyProgress,
} from "@/lib/applyStorage";
import { Locale, type MessageKey, detectLocale, t } from "@/lib/i18n";
import {
  ApplyFieldErrors,
  ApplyValidationCode,
  findFirstValidationIssue,
  firstFieldErrorCode,
  firstFieldErrorKey,
  housingFieldErrors,
  isImmediateAvailability,
  moveInValidationCode,
  parseUnitAvailableDate,
  unitEarliestMoveIn,
  otherEmailsForGuarantor,
  otherEmailsForPrimary,
  otherEmailsForRoommate,
  personalFieldErrors,
  referencesFieldErrors,
  validateEmailUniqueness,
  validatePhones,
} from "@/lib/applyValidation";

const VALIDATION_MESSAGE: Record<ApplyValidationCode, MessageKey> = {
  move_in_too_soon: "validationMoveInTooSoon",
  move_in_before_available: "validationMoveInBeforeAvailable",
  invalid_email: "validationInvalidEmail",
  duplicate_email: "validationDuplicateEmail",
  landlord_hr_same_phone: "validationLandlordHrSamePhone",
  invalid_phone: "validationInvalidPhone",
};

type Step =
  | "building"
  | "unit"
  | "personal"
  | "addresses"
  | "housing"
  | "references"
  | "other"
  | "review"
  | "done";

const FORM_STEPS: Step[] = [
  "personal",
  "addresses",
  "housing",
  "references",
  "other",
  "review",
];

type FormFields = {
  given_name: string;
  family_name: string;
  date_of_birth: string;
  email: string;
  phone: string;
  current_address: string;
  current_place_id: string;
  previous_address: string;
  previous_place_id: string;
  lease_in_name: boolean | null;
  move_in_date: string;
  renting_with_others: boolean | null;
  landlord_name: string;
  landlord_phone: string;
  hr_name: string;
  hr_phone: string;
  referral_source: string;
  facebook_url: string;
  linkedin_url: string;
};

const emptyForm: FormFields = {
  given_name: "",
  family_name: "",
  date_of_birth: "",
  email: "",
  phone: "",
  current_address: "",
  current_place_id: "",
  previous_address: "",
  previous_place_id: "",
  lease_in_name: null,
  move_in_date: "",
  renting_with_others: null,
  landlord_name: "",
  landlord_phone: "",
  hr_name: "",
  hr_phone: "",
  referral_source: "",
  facebook_url: "",
  linkedin_url: "",
};

function formatRent(rent: number | null, locale: Locale): string | null {
  if (rent == null) return null;
  const amount = Math.round(rent).toLocaleString(
    locale === "fr" ? "fr-CA" : "en-CA"
  );
  return locale === "fr"
    ? `${amount} $${t(locale, "perMonth")}`
    : `$${amount}${t(locale, "perMonth")}`;
}

function stepLabel(step: Step, locale: Locale): string {
  const map: Partial<Record<Step, MessageKey>> = {
    building: "stepBuilding",
    unit: "stepUnit",
    personal: "stepPersonal",
    addresses: "stepAddresses",
    housing: "stepHousing",
    references: "stepReferences",
    other: "stepOther",
    review: "stepReview",
  };
  const key = map[step];
  return key ? t(locale, key) : "";
}

const MAX_ROOMMATES = 5;

function formPayload(
  fields: FormFields,
  roommates: RoommateContact[],
  guarantor: GuarantorContact | null
): Omit<ApplicationSubmit, "unit_id"> {
  const payload = {
    given_name: fields.given_name.trim(),
    family_name: fields.family_name.trim(),
    date_of_birth: fields.date_of_birth,
    email: fields.email.trim(),
    phone: fields.phone.trim(),
    current_address: fields.current_address.trim(),
    current_place_id: fields.current_place_id || undefined,
    previous_address: fields.previous_address.trim() || undefined,
    previous_place_id: fields.previous_place_id || undefined,
    lease_in_name: fields.lease_in_name ?? undefined,
    move_in_date: fields.move_in_date,
    renting_with_others: fields.renting_with_others ?? undefined,
    landlord_name: fields.landlord_name.trim(),
    landlord_phone: fields.landlord_phone.trim(),
    hr_name: fields.hr_name.trim(),
    hr_phone: fields.hr_phone.trim(),
    referral_source: fields.referral_source.trim(),
    facebook_url: fields.facebook_url.trim() || undefined,
    linkedin_url: fields.linkedin_url.trim() || undefined,
    roommates: fields.renting_with_others
      ? roommates
          .map((r) => ({ name: r.name.trim(), email: r.email.trim() }))
          .filter((r) => r.name && r.email)
      : [],
    guarantor: guarantor
      ? {
          name: guarantor.name.trim(),
          email: guarantor.email.trim(),
          phone: guarantor.phone.trim(),
        }
      : null,
  } satisfies Omit<ApplicationSubmit, "unit_id">;
  return payload;
}

function isFormStep(value: string): value is (typeof FORM_STEPS)[number] {
  return (FORM_STEPS as string[]).includes(value);
}

export default function ApplyForm() {
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<Locale>("fr");
  const [step, setStep] = useState<Step>("building");
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [submittedApplicationId, setSubmittedApplicationId] = useState<number | null>(null);
  const [form, setForm] = useState<FormFields>(emptyForm);
  const [roommates, setRoommates] = useState<RoommateContact[]>([
    { name: "", email: "" },
  ]);
  const [includeGuarantor, setIncludeGuarantor] = useState(false);
  const [guarantor, setGuarantor] = useState<GuarantorContact>({
    name: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, ApplyValidationCode>>
  >({});

  const inputClass =
    "mt-1 w-full rounded border border-[#e7e0d5] bg-white px-3 py-2.5 text-base text-[#292524] outline-none transition focus:border-[#3d5a45]";

  const inputClassFor = (fieldKey: string) =>
    fieldErrors[fieldKey]
      ? `${inputClass} border-[#e7a4a4] focus:border-[#b91c1c]`
      : inputClass;

  const clearFieldError = (fieldKey: string) => {
    setFieldErrors((prev) => {
      if (!(fieldKey in prev)) return prev;
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  };

  const setFieldValidation = (fieldKey: string, code: ApplyValidationCode | null) => {
    if (code) {
      setFieldErrors((prev) => ({ ...prev, [fieldKey]: code }));
    } else {
      clearFieldError(fieldKey);
    }
  };

  const fieldHint = (fieldKey: string) => {
    const code = fieldErrors[fieldKey];
    if (!code) return null;
    return (
      <p className="mt-1 text-sm text-[#b91c1c]" role="alert">
        {t(locale, VALIDATION_MESSAGE[code])}
      </p>
    );
  };

  const scrollToField = (fieldKey: string) => {
    requestAnimationFrame(() => {
      document.getElementById(`apply-field-${fieldKey}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  const applyFieldErrors = (errors: ApplyFieldErrors) => {
    setFieldErrors(errors);
  };

  const blockWithFieldErrors = (errors: ApplyFieldErrors) => {
    if (Object.keys(errors).length === 0) return false;
    applyFieldErrors(errors);
    const code = firstFieldErrorCode(errors);
    if (code) showValidationError(code);
    const key = firstFieldErrorKey(errors);
    if (key) scrollToField(key);
    return true;
  };

  const syncPhoneValidation = (landlordPhone: string, hrPhone: string) => {
    const code = validatePhones(landlordPhone, hrPhone);
    setFieldValidation("landlord_phone", code);
    setFieldValidation("hr_phone", code);
  };

  const StepAlert = () =>
    error ? (
      <div
        className="rounded border border-[#e7c4c4] bg-[#fdf5f5] px-4 py-3 text-sm text-[#7f1d1d]"
        role="alert"
      >
        {error}
      </div>
    ) : null;

  const preselectBuildingId = searchParams.get("building");

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  const loadBuildings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBuildings();
      setBuildings(data);
      if (preselectBuildingId) {
        const b = data.find((x) => x.id === Number(preselectBuildingId));
        if (b) {
          setSelectedBuilding(b);
          setStep("unit");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "error"));
    } finally {
      setLoading(false);
    }
  }, [preselectBuildingId, locale]);

  useEffect(() => {
    loadBuildings();
  }, [loadBuildings]);

  useEffect(() => {
    if (!selectedBuilding) return;
    setLoading(true);
    fetchUnits(selectedBuilding.id)
      .then(setUnits)
      .catch((e) =>
        setError(e instanceof Error ? e.message : t(locale, "error"))
      )
      .finally(() => setLoading(false));
  }, [selectedBuilding, locale]);

  const persistProgress = useCallback(
    (nextStep: Step) => {
      if (!selectedUnit || !selectedBuilding) return;
      saveApplyProgress({
        unitId: selectedUnit.id,
        buildingId: selectedBuilding.id,
        step: nextStep,
        form,
        roommates,
        includeGuarantor,
        guarantor,
        updatedAt: new Date().toISOString(),
      });
    },
    [selectedUnit, selectedBuilding, form, roommates, includeGuarantor, guarantor]
  );

  const fieldErrorsForFormStep = (
    formStep: (typeof FORM_STEPS)[number]
  ): ApplyFieldErrors => {
    const input = validationInput();
    switch (formStep) {
      case "personal":
        return personalFieldErrors(input.email, form.phone);
      case "housing":
        return housingFieldErrors(input);
      case "references":
        return referencesFieldErrors(input.landlord_phone, input.hr_phone);
      default:
        return {};
    }
  };

  const continueToStep = (next: Step) => {
    setError(null);
    persistProgress(next);
    setStep(next);
  };

  const goToFormStep = (target: (typeof FORM_STEPS)[number]) => {
    setError(null);
    const currentIdx = FORM_STEPS.indexOf(step as (typeof FORM_STEPS)[number]);
    const targetIdx = FORM_STEPS.indexOf(target);
    if (currentIdx >= 0 && targetIdx > currentIdx) {
      for (let i = currentIdx; i < targetIdx; i++) {
        const stepErrors = fieldErrorsForFormStep(FORM_STEPS[i]);
        if (blockWithFieldErrors(stepErrors)) {
          setStep(FORM_STEPS[i]);
          persistProgress(FORM_STEPS[i]);
          return;
        }
      }
    }
    persistProgress(target);
    setStep(target);
  };

  const handleSelectBuilding = (b: Building) => {
    setSelectedBuilding(b);
    setSelectedUnit(null);
    setSubmittedApplicationId(null);
    setForm(emptyForm);
    setRoommates([{ name: "", email: "" }]);
    setIncludeGuarantor(false);
    setGuarantor({ name: "", email: "", phone: "" });
    setStep("unit");
  };

  const handleSelectUnit = (u: Unit) => {
    if (!selectedBuilding) return;
    setSelectedUnit(u);
    setSubmittedApplicationId(null);
    setError(null);

    const saved = loadApplyProgress(u.id);
    if (saved && saved.buildingId === selectedBuilding.id) {
      setForm({ ...emptyForm, ...(saved.form as FormFields) });
      setRoommates(saved.roommates.length ? saved.roommates : [{ name: "", email: "" }]);
      setIncludeGuarantor(saved.includeGuarantor);
      setGuarantor(saved.guarantor);
      setStep(isFormStep(saved.step) ? saved.step : "personal");
    } else {
      setForm(emptyForm);
      setRoommates([{ name: "", email: "" }]);
      setIncludeGuarantor(false);
      setGuarantor({ name: "", email: "", phone: "" });
      setStep("personal");
    }
  };

  const validationInput = () => ({
    move_in_date: form.move_in_date,
    unit_earliest_move_in: selectedUnit?.earliest_move_in_date ?? null,
    unit_available_date: selectedUnit?.available_date ?? null,
    email: form.email,
    phone: form.phone,
    roommates: form.renting_with_others ? roommates : [],
    includeGuarantor,
    guarantor: includeGuarantor ? guarantor : null,
    landlord_phone: form.landlord_phone,
    hr_phone: form.hr_phone,
  });

  const moveInUnitContext = () =>
    selectedUnit
      ? {
          earliest_move_in_date: selectedUnit.earliest_move_in_date,
          available_date: selectedUnit.available_date,
        }
      : null;

  const moveInHint = (): string | null => {
    if (!selectedUnit) return null;
    if (isImmediateAvailability(selectedUnit.available_date)) {
      return t(locale, "moveInHintImmediate");
    }
    const parsed = parseUnitAvailableDate(selectedUnit.available_date);
    if (parsed) {
      return t(locale, "moveInHintAvailableFrom").replace("{date}", parsed);
    }
    if (selectedUnit.available_date) {
      return `${t(locale, "available")}: ${selectedUnit.available_date}`;
    }
    return null;
  };

  const showValidationError = (code: ApplyValidationCode) => {
    setError(t(locale, VALIDATION_MESSAGE[code]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;
    const input = validationInput();
    const issue = findFirstValidationIssue(input);
    if (issue) {
      const errors =
        issue.step === "personal"
          ? personalFieldErrors(input.email)
          : issue.step === "housing"
            ? housingFieldErrors(input)
            : referencesFieldErrors(input.landlord_phone, input.hr_phone);
      blockWithFieldErrors(errors);
      persistProgress(issue.step);
      setStep(issue.step);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const app = await submitApplication({
        unit_id: selectedUnit.id,
        ...formPayload(form, roommates, includeGuarantor ? guarantor : null),
      });
      clearApplyProgress(selectedUnit.id);
      setSubmittedApplicationId(app.id);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "error"));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLocale = () => {
    setLocale(locale === "en" ? "fr" : "en");
  };

  const setField = <K extends keyof FormFields>(key: K, value: FormFields[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    clearFieldError(key);
    setError(null);
  };

  const formStepIndex =
    step === "done" ? FORM_STEPS.length : FORM_STEPS.indexOf(step as (typeof FORM_STEPS)[number]);
  const showFormProgress = FORM_STEPS.includes(step as (typeof FORM_STEPS)[number]) || step === "done";

  const backFromForm = () => {
    const idx = FORM_STEPS.indexOf(step as (typeof FORM_STEPS)[number]);
    if (idx <= 0) {
      setStep("unit");
      return;
    }
    setStep(FORM_STEPS[idx - 1]);
  };

  const ReviewRow = ({ label, value }: { label: string; value: string | null | undefined }) =>
    value ? (
      <div className="px-4 py-3">
        <dt className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-[#a8a29e]">
          {label}
        </dt>
        <dd className="mt-1 text-sm text-[#292524]">{value}</dd>
      </div>
    ) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-10">
      <header className="mb-10 border-b border-[#e7e0d5] pb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#78716c]">
              SureCap
            </p>
            <h1 className="mt-2 text-[1.65rem] font-semibold leading-tight text-[#292524]">
              {t(locale, "title")}
            </h1>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-[#57534e]">
              {t(locale, "subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleLocale}
            className="shrink-0 rounded border border-[#d6d0c4] bg-[#fffef9] px-3 py-1.5 text-sm text-[#44403c] transition hover:border-[#a8a29e]"
          >
            {t(locale, "langToggle")}
          </button>
        </div>

        {showFormProgress && (
          <nav className="mt-6 flex gap-1" aria-label="Application steps">
            {FORM_STEPS.map((s, i) => {
              const active = step === s;
              const done = formStepIndex > i || step === "done";
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => goToFormStep(s)}
                  aria-current={active ? "step" : undefined}
                  className={`flex flex-1 flex-col gap-1.5 rounded-md px-1 py-1.5 text-left transition ${
                    active
                      ? "bg-[#e8f0ea] ring-1 ring-[#3d5a45]/40"
                      : "hover:bg-[#f5f2ec]"
                  }`}
                >
                  <div
                    className={`rounded-full transition-colors ${
                      active ? "h-1.5" : "h-1"
                    } ${active || done ? "bg-[#3d5a45]" : "bg-[#e7e0d5]"}`}
                  />
                  <span
                    className={`truncate text-[0.65rem] leading-tight ${
                      active
                        ? "font-semibold text-[#1c1917]"
                        : done
                          ? "font-medium text-[#44403c]"
                          : "text-[#a8a29e]"
                    }`}
                  >
                    {stepLabel(s, locale)}
                  </span>
                </button>
              );
            })}
          </nav>
        )}
      </header>

      {error && (
        <div className="mb-5 rounded border border-[#e7c4c4] bg-[#fdf5f5] px-4 py-3 text-sm text-[#7f1d1d]">
          {error}
        </div>
      )}

      {loading && (step === "building" || step === "unit") && (
        <p className="py-8 text-center text-sm text-[#78716c]">
          {t(locale, "loading")}
        </p>
      )}

      {!loading && step === "building" && (
        <section>
          <h2 className="mb-5 text-base font-medium text-[#292524]">
            {t(locale, "selectBuilding")}
          </h2>
          {buildings.length === 0 ? (
            <p className="rounded border border-[#e7e0d5] bg-[#fffef9] px-4 py-6 text-sm leading-relaxed text-[#57534e]">
              {t(locale, "noBuildings")}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {buildings.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectBuilding(b)}
                    className="group w-full rounded border border-[#e7e0d5] bg-[#fffef9] px-4 py-4 text-left transition hover:border-[#3d5a45]"
                  >
                    <span className="block font-medium text-[#292524] group-hover:text-[#3d5a45]">
                      {b.name}
                    </span>
                    <span className="mt-1 block text-sm leading-snug text-[#78716c]">
                      {b.address}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {step === "unit" && selectedBuilding && !loading && (
        <section>
          <button
            type="button"
            onClick={() => {
              setSelectedBuilding(null);
              setUnits([]);
              setStep("building");
            }}
            className="mb-5 text-sm text-[#57534e] underline-offset-2 hover:underline"
          >
            ← {t(locale, "back")}
          </button>
          <h2 className="text-base font-medium text-[#292524]">
            {t(locale, "selectUnit")}
          </h2>
          <p className="mb-5 mt-1 text-sm text-[#78716c]">
            {selectedBuilding.name}
          </p>
          <ul className="space-y-2.5">
            {units.map((u) => {
              const rentLabel = formatRent(u.rent, locale);
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSelectUnit(u)}
                    className="group w-full rounded border border-[#e7e0d5] bg-[#fffef9] px-4 py-4 text-left transition hover:border-[#3d5a45] disabled:opacity-60"
                  >
                    <span className="block font-medium text-[#292524]">
                      {u.unit_number}
                    </span>
                    {u.civic_number && (
                      <span className="mt-1 block text-sm text-[#78716c]">
                        {u.civic_number}
                      </span>
                    )}
                    {rentLabel && (
                      <span className="mt-1.5 block text-sm text-[#44403c]">
                        {t(locale, "rent")}: {rentLabel}
                      </span>
                    )}
                    {u.available_date && (
                      <span className="mt-0.5 block text-sm text-[#78716c]">
                        {t(locale, "available")}: {u.available_date}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {step === "personal" && (
        <section>
          <button
            type="button"
            onClick={() => setStep("unit")}
            className="mb-5 text-sm text-[#57534e] underline-offset-2 hover:underline"
          >
            ← {t(locale, "back")}
          </button>
          <h2 className="mb-5 text-base font-medium text-[#292524]">
            {t(locale, "personalInfo")}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (blockWithFieldErrors(personalFieldErrors(form.email))) return;
              setError(null);
              continueToStep("addresses");
            }}
            className="space-y-4"
          >
            <label className="block text-sm text-[#57534e]">
              {t(locale, "givenName")}
              <input
                type="text"
                required
                autoComplete="given-name"
                value={form.given_name}
                onChange={(e) => setField("given_name", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-sm text-[#57534e]">
              {t(locale, "familyName")}
              <input
                type="text"
                required
                autoComplete="family-name"
                value={form.family_name}
                onChange={(e) => setField("family_name", e.target.value)}
                className={inputClass}
              />
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
            </label>
            <div id="apply-field-email">
            <label className="block text-sm text-[#57534e]">
              {t(locale, "email")}
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                onBlur={() => {
                  const code = validateEmailUniqueness(
                    form.email,
                    otherEmailsForPrimary(validationInput())
                  );
                  setFieldValidation("email", code);
                }}
                className={inputClassFor("email")}
              />
              {fieldHint("email")}
            </label>
            </div>
            <label className="block text-sm text-[#57534e]">
              {t(locale, "phone")}
              <input
                type="tel"
                required
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => {
                  setField("phone", e.target.value);
                  clearFieldError("phone");
                }}
                className={inputClassFor("phone")}
              />
              {fieldHint("phone")}
            </label>
            <StepAlert />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-[#3d5a45] py-3.5 text-sm font-medium text-[#f4f1ec] transition hover:bg-[#334d3a] disabled:opacity-60"
            >
              {submitting ? t(locale, "loading") : t(locale, "continue")}
            </button>
          </form>
        </section>
      )}

      {step === "addresses" && (
        <section>
          <button
            type="button"
            onClick={backFromForm}
            className="mb-5 text-sm text-[#57534e] underline-offset-2 hover:underline"
          >
            ← {t(locale, "back")}
          </button>
          <h2 className="mb-5 text-base font-medium text-[#292524]">
            {t(locale, "addresses")}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              continueToStep("housing");
            }}
            className="space-y-4"
          >
            <AddressAutocomplete
              locale={locale}
              label={t(locale, "currentAddress")}
              value={form.current_address}
              onChange={(address, placeId) => {
                setField("current_address", address);
                if (placeId) setField("current_place_id", placeId);
              }}
              required
              inputClass={inputClass}
            />
            <AddressAutocomplete
              locale={locale}
              label={t(locale, "previousAddress")}
              value={form.previous_address}
              onChange={(address, placeId) => {
                setField("previous_address", address);
                if (placeId) setField("previous_place_id", placeId);
              }}
              inputClass={inputClass}
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-[#3d5a45] py-3.5 text-sm font-medium text-[#f4f1ec] transition hover:bg-[#334d3a] disabled:opacity-60"
            >
              {submitting ? t(locale, "loading") : t(locale, "continue")}
            </button>
          </form>
        </section>
      )}

      {step === "housing" && (
        <section>
          <button
            type="button"
            onClick={backFromForm}
            className="mb-5 text-sm text-[#57534e] underline-offset-2 hover:underline"
          >
            ← {t(locale, "back")}
          </button>
          <h2 className="mb-5 text-base font-medium text-[#292524]">
            {t(locale, "housing")}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (blockWithFieldErrors(housingFieldErrors(validationInput()))) return;
              setError(null);
              continueToStep("references");
            }}
            className="space-y-4"
          >
            <fieldset>
              <legend className="text-sm text-[#57534e]">
                {t(locale, "leaseInName")}
              </legend>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2 text-sm text-[#292524]">
                  <input
                    type="radio"
                    name="lease_in_name"
                    required
                    checked={form.lease_in_name === true}
                    onChange={() => setField("lease_in_name", true)}
                  />
                  {t(locale, "yes")}
                </label>
                <label className="flex items-center gap-2 text-sm text-[#292524]">
                  <input
                    type="radio"
                    name="lease_in_name"
                    checked={form.lease_in_name === false}
                    onChange={() => setField("lease_in_name", false)}
                  />
                  {t(locale, "no")}
                </label>
              </div>
            </fieldset>
            <div id="apply-field-move_in_date">
            <label className="block text-sm text-[#57534e]">
              {t(locale, "moveInDate")}
              <input
                type="date"
                required
                min={unitEarliestMoveIn(moveInUnitContext())}
                value={form.move_in_date}
                onChange={(e) => {
                  const value = e.target.value;
                  setField("move_in_date", value);
                  if (value) {
                    setFieldValidation(
                      "move_in_date",
                      moveInValidationCode(value, moveInUnitContext())
                    );
                  }
                }}
                onBlur={() => {
                  if (!form.move_in_date) return;
                  setFieldValidation(
                    "move_in_date",
                    moveInValidationCode(form.move_in_date, moveInUnitContext())
                  );
                }}
                className={inputClassFor("move_in_date")}
              />
              {moveInHint() && (
                <p className="mt-1 text-xs text-[#78716c]">{moveInHint()}</p>
              )}
              {fieldHint("move_in_date")}
            </label>
            </div>
            <fieldset>
              <legend className="text-sm text-[#57534e]">
                {t(locale, "rentingWithOthers")}
              </legend>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2 text-sm text-[#292524]">
                  <input
                    type="radio"
                    name="renting_with_others"
                    required
                    checked={form.renting_with_others === true}
                    onChange={() => setField("renting_with_others", true)}
                  />
                  {t(locale, "yes")}
                </label>
                <label className="flex items-center gap-2 text-sm text-[#292524]">
                  <input
                    type="radio"
                    name="renting_with_others"
                    checked={form.renting_with_others === false}
                    onChange={() => setField("renting_with_others", false)}
                  />
                  {t(locale, "no")}
                </label>
              </div>
            </fieldset>
            {form.renting_with_others && (
              <div className="space-y-4 rounded border border-[#e7e0d5] bg-[#fffef9] p-4">
                <p className="text-sm font-medium text-[#292524]">
                  {t(locale, "coTenantNames")}
                </p>
                {roommates.map((roommate, index) => (
                  <div key={index} className="space-y-3 border-t border-[#efe9df] pt-3 first:border-t-0 first:pt-0">
                    <label className="block text-sm text-[#57534e]">
                      {t(locale, "roommateName")}
                      <input
                        required
                        value={roommate.name}
                        onChange={(e) =>
                          setRoommates((rows) =>
                            rows.map((row, i) =>
                              i === index ? { ...row, name: e.target.value } : row
                            )
                          )
                        }
                        className={inputClass}
                      />
                    </label>
                    <div id={`apply-field-roommate_email_${index}`}>
                    <label className="block text-sm text-[#57534e]">
                      {t(locale, "roommateEmail")}
                      <input
                        type="email"
                        required
                        value={roommate.email}
                        onChange={(e) => {
                          const value = e.target.value;
                          const fieldKey = `roommate_email_${index}`;
                          clearFieldError(fieldKey);
                          setError(null);
                          setRoommates((rows) =>
                            rows.map((row, i) =>
                              i === index ? { ...row, email: value } : row
                            )
                          );
                          const input = validationInput();
                          const nextRoommates = input.roommates.map((row, i) =>
                            i === index ? { ...row, email: value } : row
                          );
                          const code = validateEmailUniqueness(
                            value,
                            otherEmailsForRoommate(
                              { ...input, roommates: nextRoommates },
                              index
                            )
                          );
                          if (code) setFieldValidation(fieldKey, code);
                        }}
                        onBlur={() => {
                          const fieldKey = `roommate_email_${index}`;
                          setFieldValidation(
                            fieldKey,
                            validateEmailUniqueness(
                              roommate.email,
                              otherEmailsForRoommate(validationInput(), index)
                            )
                          );
                        }}
                        className={inputClassFor(`roommate_email_${index}`)}
                      />
                      {fieldHint(`roommate_email_${index}`)}
                    </label>
                    </div>
                    {roommates.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setRoommates((rows) => rows.filter((_, i) => i !== index))
                        }
                        className="text-sm text-[#57534e] underline-offset-2 hover:underline"
                      >
                        {t(locale, "removeRoommate")}
                      </button>
                    )}
                  </div>
                ))}
                {roommates.length < MAX_ROOMMATES && (
                  <button
                    type="button"
                    onClick={() =>
                      setRoommates((rows) => [...rows, { name: "", email: "" }])
                    }
                    className="text-sm font-medium text-[#3d5a45] underline-offset-2 hover:underline"
                  >
                    {t(locale, "addRoommate")}
                  </button>
                )}
              </div>
            )}
            <div className="rounded border border-[#e7e0d5] bg-[#fffef9] p-4">
              <h3 className="text-sm font-medium text-[#292524]">
                {t(locale, "guarantorOptional")}
              </h3>
              <label className="mt-3 flex items-center gap-2 text-sm text-[#292524]">
                <input
                  type="checkbox"
                  checked={includeGuarantor}
                  onChange={(e) => setIncludeGuarantor(e.target.checked)}
                />
                {t(locale, "includeGuarantor")}
              </label>
              {includeGuarantor && (
                <div className="mt-4 space-y-3">
                  <label className="block text-sm text-[#57534e]">
                    {t(locale, "guarantorName")}
                    <input
                      required
                      value={guarantor.name}
                      onChange={(e) =>
                        setGuarantor((g) => ({ ...g, name: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <div id="apply-field-guarantor_email">
                  <label className="block text-sm text-[#57534e]">
                    {t(locale, "email")}
                    <input
                      type="email"
                      required
                      value={guarantor.email}
                      onChange={(e) => {
                        const value = e.target.value;
                        clearFieldError("guarantor_email");
                        setError(null);
                        setGuarantor((g) => ({ ...g, email: value }));
                        const code = validateEmailUniqueness(
                          value,
                          otherEmailsForGuarantor(validationInput())
                        );
                        if (code) setFieldValidation("guarantor_email", code);
                      }}
                      onBlur={() =>
                        setFieldValidation(
                          "guarantor_email",
                          validateEmailUniqueness(
                            guarantor.email,
                            otherEmailsForGuarantor(validationInput())
                          )
                        )
                      }
                      className={inputClassFor("guarantor_email")}
                    />
                    {fieldHint("guarantor_email")}
                  </label>
                  </div>
                  <div id="apply-field-guarantor_phone">
                  <label className="block text-sm text-[#57534e]">
                    {t(locale, "guarantorPhone")}
                    <input
                      type="tel"
                      required
                      value={guarantor.phone}
                      onChange={(e) => {
                        clearFieldError("guarantor_phone");
                        setGuarantor((g) => ({ ...g, phone: e.target.value }));
                      }}
                      className={inputClassFor("guarantor_phone")}
                    />
                    {fieldHint("guarantor_phone")}
                  </label>
                  </div>
                </div>
              )}
            </div>
            <StepAlert />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-[#3d5a45] py-3.5 text-sm font-medium text-[#f4f1ec] transition hover:bg-[#334d3a] disabled:opacity-60"
            >
              {submitting ? t(locale, "loading") : t(locale, "continue")}
            </button>
          </form>
        </section>
      )}

      {step === "references" && (
        <section>
          <button
            type="button"
            onClick={backFromForm}
            className="mb-5 text-sm text-[#57534e] underline-offset-2 hover:underline"
          >
            ← {t(locale, "back")}
          </button>
          <h2 className="mb-5 text-base font-medium text-[#292524]">
            {t(locale, "references")}
          </h2>
          <p className="mb-5 text-sm leading-relaxed text-[#78716c]">
            {t(locale, "referencesNote")}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                blockWithFieldErrors(
                  referencesFieldErrors(form.landlord_phone, form.hr_phone)
                )
              ) {
                return;
              }
              setError(null);
              continueToStep("other");
            }}
            className="space-y-4"
          >
            <div id="apply-field-landlord_name">
            <label className="block text-sm text-[#57534e]">
              {t(locale, "landlordName")}
              <input
                type="text"
                required
                autoComplete="name"
                value={form.landlord_name}
                onChange={(e) => setField("landlord_name", e.target.value)}
                className={inputClassFor("landlord_name")}
              />
            </label>
            </div>
            <div id="apply-field-landlord_phone">
            <label className="block text-sm text-[#57534e]">
              {t(locale, "landlordPhone")}
              <input
                type="tel"
                required
                value={form.landlord_phone}
                onChange={(e) => {
                  const value = e.target.value;
                  setField("landlord_phone", value);
                  syncPhoneValidation(value, form.hr_phone);
                }}
                className={inputClassFor("landlord_phone")}
              />
              {fieldHint("landlord_phone")}
            </label>
            </div>
            <div id="apply-field-hr_name">
            <label className="block text-sm text-[#57534e]">
              {t(locale, "hrName")}
              <input
                type="text"
                required
                autoComplete="name"
                value={form.hr_name}
                onChange={(e) => setField("hr_name", e.target.value)}
                className={inputClassFor("hr_name")}
              />
            </label>
            </div>
            <div id="apply-field-hr_phone">
            <label className="block text-sm text-[#57534e]">
              {t(locale, "hrPhone")}
              <input
                type="tel"
                required
                value={form.hr_phone}
                onChange={(e) => {
                  const value = e.target.value;
                  setField("hr_phone", value);
                  syncPhoneValidation(form.landlord_phone, value);
                }}
                className={inputClassFor("hr_phone")}
              />
              {fieldHint("hr_phone")}
            </label>
            </div>
            <StepAlert />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-[#3d5a45] py-3.5 text-sm font-medium text-[#f4f1ec] transition hover:bg-[#334d3a] disabled:opacity-60"
            >
              {submitting ? t(locale, "loading") : t(locale, "continue")}
            </button>
          </form>
        </section>
      )}

      {step === "other" && (
        <section>
          <button
            type="button"
            onClick={backFromForm}
            className="mb-5 text-sm text-[#57534e] underline-offset-2 hover:underline"
          >
            ← {t(locale, "back")}
          </button>
          <h2 className="mb-5 text-base font-medium text-[#292524]">
            {t(locale, "otherInfo")}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              continueToStep("review");
            }}
            className="space-y-4"
          >
            <label className="block text-sm text-[#57534e]">
              {t(locale, "referralSource")}
              <textarea
                required
                rows={3}
                value={form.referral_source}
                onChange={(e) => setField("referral_source", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-sm text-[#57534e]">
              {t(locale, "facebookUrl")}
              <input
                type="url"
                value={form.facebook_url}
                onChange={(e) => setField("facebook_url", e.target.value)}
                className={inputClass}
                placeholder="https://"
              />
            </label>
            <label className="block text-sm text-[#57534e]">
              {t(locale, "linkedinUrl")}
              <input
                type="url"
                value={form.linkedin_url}
                onChange={(e) => setField("linkedin_url", e.target.value)}
                className={inputClass}
                placeholder="https://"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-[#3d5a45] py-3.5 text-sm font-medium text-[#f4f1ec] transition hover:bg-[#334d3a] disabled:opacity-60"
            >
              {submitting ? t(locale, "loading") : t(locale, "continue")}
            </button>
          </form>
        </section>
      )}

      {step === "review" && selectedBuilding && selectedUnit && (
        <section>
          <button
            type="button"
            onClick={backFromForm}
            className="mb-5 text-sm text-[#57534e] underline-offset-2 hover:underline"
          >
            ← {t(locale, "back")}
          </button>
          <h2 className="mb-2 text-base font-medium text-[#292524]">
            {t(locale, "review")}
          </h2>
          <p className="mb-5 text-sm leading-relaxed text-[#78716c]">
            {t(locale, "reviewNote")}
          </p>

          <h3 className="mb-2 text-sm font-medium text-[#292524]">
            {t(locale, "yourSelection")}
          </h3>
          <dl className="mb-5 divide-y divide-[#ebe5db] rounded border border-[#e7e0d5] bg-[#fffef9]">
            <div className="px-4 py-3">
              <dt className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-[#a8a29e]">
                {t(locale, "building")}
              </dt>
              <dd className="mt-1 font-medium text-[#292524]">
                {selectedBuilding.name}
              </dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-[#a8a29e]">
                {t(locale, "unit")}
              </dt>
              <dd className="mt-1 font-medium text-[#292524]">
                {selectedUnit.unit_number}
              </dd>
            </div>
          </dl>

          <dl className="mb-5 divide-y divide-[#ebe5db] rounded border border-[#e7e0d5] bg-[#fffef9]">
            <ReviewRow
              label={t(locale, "givenName")}
              value={form.given_name}
            />
            <ReviewRow
              label={t(locale, "familyName")}
              value={form.family_name}
            />
            <ReviewRow
              label={t(locale, "dateOfBirth")}
              value={form.date_of_birth}
            />
            <ReviewRow label={t(locale, "email")} value={form.email} />
            <ReviewRow label={t(locale, "phone")} value={form.phone} />
            <ReviewRow
              label={t(locale, "currentAddress")}
              value={form.current_address}
            />
            {form.previous_address && (
              <ReviewRow
                label={t(locale, "previousAddress")}
                value={form.previous_address}
              />
            )}
            <ReviewRow
              label={t(locale, "moveInDate")}
              value={form.move_in_date}
            />
            <ReviewRow
              label={t(locale, "landlordName")}
              value={form.landlord_name}
            />
            <ReviewRow
              label={t(locale, "landlordPhone")}
              value={form.landlord_phone}
            />
            <ReviewRow label={t(locale, "hrName")} value={form.hr_name} />
            <ReviewRow label={t(locale, "hrPhone")} value={form.hr_phone} />
            <ReviewRow
              label={t(locale, "referralSource")}
              value={form.referral_source}
            />
            {form.renting_with_others &&
              roommates
                .filter((r) => r.name.trim() && r.email.trim())
                .map((roommate, index) => (
                  <ReviewRow
                    key={`${roommate.email}-${index}`}
                    label={`${t(locale, "roommateName")} ${index + 1}`}
                    value={`${roommate.name} (${roommate.email})`}
                  />
                ))}
            {includeGuarantor && (
              <ReviewRow
                label={t(locale, "guarantorName")}
                value={`${guarantor.name} (${guarantor.email}, ${guarantor.phone})`}
              />
            )}
          </dl>

          <form onSubmit={handleSubmit}>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-[#3d5a45] py-3.5 text-sm font-medium text-[#f4f1ec] transition hover:bg-[#334d3a] disabled:opacity-60"
            >
              {submitting ? t(locale, "loading") : t(locale, "submit")}
            </button>
          </form>
        </section>
      )}

      {step === "done" && submittedApplicationId !== null && (
        <section className="rounded border border-[#c9dcc9] bg-[#f6faf6] px-6 py-8 text-center">
          <h2 className="text-lg font-semibold text-[#1a3d22]">
            {t(locale, "successTitle")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#3d5a45]">
            {t(locale, "successBody")}
          </p>
          <p className="mt-5 text-sm text-[#57534e]">
            {t(locale, "applicationId")}:{" "}
            <span className="font-medium text-[#292524]">#{submittedApplicationId}</span>
          </p>
        </section>
      )}
    </main>
  );
}
