"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AddressAutocomplete from "./AddressAutocomplete";
import {
  ApplicationUpdate,
  Building,
  Unit,
  createApplicationDraft,
  fetchBuildings,
  fetchUnits,
  submitApplication,
  updateApplication,
} from "@/lib/api";
import { Locale, detectLocale, t } from "@/lib/i18n";

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
  co_tenant_names: string;
  landlord_email: string;
  hr_email: string;
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
  co_tenant_names: "",
  landlord_email: "",
  hr_email: "",
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

type MessageKey = Parameters<typeof t>[1];

function formPayload(fields: FormFields, locale: Locale): ApplicationUpdate {
  return {
    preferred_locale: locale,
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
    co_tenant_names: fields.co_tenant_names.trim() || undefined,
    landlord_email: fields.landlord_email.trim(),
    hr_email: fields.hr_email.trim(),
    referral_source: fields.referral_source.trim(),
    facebook_url: fields.facebook_url.trim() || undefined,
    linkedin_url: fields.linkedin_url.trim() || undefined,
  };
}

export default function ApplyForm() {
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<Locale>("fr");
  const [step, setStep] = useState<Step>("building");
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [form, setForm] = useState<FormFields>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "mt-1 w-full rounded border border-[#e7e0d5] bg-white px-3 py-2.5 text-sm text-[#292524] outline-none transition focus:border-[#3d5a45]";

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

  const patchAndContinue = async (next: Step) => {
    if (!applicationId) {
      setStep(next);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateApplication(applicationId, formPayload(form, locale));
      setStep(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectBuilding = (b: Building) => {
    setSelectedBuilding(b);
    setSelectedUnit(null);
    setApplicationId(null);
    setForm(emptyForm);
    setStep("unit");
  };

  const handleSelectUnit = async (u: Unit) => {
    setSelectedUnit(u);
    setSubmitting(true);
    setError(null);
    try {
      const app = await createApplicationDraft(u.id);
      setApplicationId(app.id);
      setStep("personal");
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationId) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateApplication(applicationId, formPayload(form, locale));
      await submitApplication(applicationId);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "error"));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLocale = async () => {
    const next = locale === "en" ? "fr" : "en";
    setLocale(next);
    if (applicationId) {
      try {
        await updateApplication(applicationId, { preferred_locale: next });
      } catch {
        /* non-blocking */
      }
    }
  };

  const setField = <K extends keyof FormFields>(key: K, value: FormFields[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
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
                <div key={s} className="flex flex-1 flex-col gap-1.5">
                  <div
                    className={`h-1 rounded-full transition-colors ${
                      active || done ? "bg-[#3d5a45]" : "bg-[#e7e0d5]"
                    }`}
                  />
                  <span
                    className={`truncate text-[0.65rem] ${
                      active ? "font-medium text-[#292524]" : "text-[#a8a29e]"
                    }`}
                  >
                    {stepLabel(s, locale)}
                  </span>
                </div>
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
              patchAndContinue("addresses");
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
            <label className="block text-sm text-[#57534e]">
              {t(locale, "email")}
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-sm text-[#57534e]">
              {t(locale, "phone")}
              <input
                type="tel"
                required
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                className={inputClass}
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
              patchAndContinue("housing");
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
              patchAndContinue("references");
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
            <label className="block text-sm text-[#57534e]">
              {t(locale, "moveInDate")}
              <input
                type="date"
                required
                value={form.move_in_date}
                onChange={(e) => setField("move_in_date", e.target.value)}
                className={inputClass}
              />
            </label>
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
              <label className="block text-sm text-[#57534e]">
                {t(locale, "coTenantNames")}
                <textarea
                  required
                  rows={2}
                  value={form.co_tenant_names}
                  onChange={(e) => setField("co_tenant_names", e.target.value)}
                  className={inputClass}
                />
              </label>
            )}
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              patchAndContinue("other");
            }}
            className="space-y-4"
          >
            <label className="block text-sm text-[#57534e]">
              {t(locale, "landlordEmail")}
              <input
                type="email"
                required
                value={form.landlord_email}
                onChange={(e) => setField("landlord_email", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-sm text-[#57534e]">
              {t(locale, "hrEmail")}
              <input
                type="email"
                required
                value={form.hr_email}
                onChange={(e) => setField("hr_email", e.target.value)}
                className={inputClass}
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
              patchAndContinue("review");
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
              label={t(locale, "landlordEmail")}
              value={form.landlord_email}
            />
            <ReviewRow label={t(locale, "hrEmail")} value={form.hr_email} />
            <ReviewRow
              label={t(locale, "referralSource")}
              value={form.referral_source}
            />
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

      {step === "done" && applicationId !== null && (
        <section className="rounded border border-[#c9dcc9] bg-[#f6faf6] px-6 py-8 text-center">
          <h2 className="text-lg font-semibold text-[#1a3d22]">
            {t(locale, "successTitle")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#3d5a45]">
            {t(locale, "successBody")}
          </p>
          <p className="mt-5 text-sm text-[#57534e]">
            {t(locale, "applicationId")}:{" "}
            <span className="font-medium text-[#292524]">#{applicationId}</span>
          </p>
        </section>
      )}
    </main>
  );
}
