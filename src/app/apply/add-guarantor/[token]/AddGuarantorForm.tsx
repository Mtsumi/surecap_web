"use client";

import { FormEvent, useEffect, useState } from "react";
import PhoneField from "../../PhoneField";
import {
  AddGuarantorContext,
  fetchAddGuarantor,
  submitAddGuarantor,
} from "@/lib/api";
import {
  Locale,
  detectLocale,
  t,
} from "@/lib/i18n";
import {
  validateEmailFormat,
  validatePhoneFormat,
} from "@/lib/applyValidation";

const inputClass =
  "mt-1 w-full rounded border border-[#e7e0d5] bg-white px-3 py-2.5 text-base text-[#292524] outline-none transition focus:border-[#3d5a45]";

export default function AddGuarantorForm({ token }: { token: string }) {
  const [locale, setLocale] = useState<Locale>("fr");
  const [context, setContext] = useState<AddGuarantorContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAddGuarantor(token)
      .then((data) => {
        if (cancelled) return;
        if (data.status !== "awaiting_credit_check") {
          setError(t(locale, "addGuarantorExpired"));
          return;
        }
        setContext(data);
      })
      .catch(() => {
        if (!cancelled) setError(t(locale, "addGuarantorExpired"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, locale]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!context || context.has_guarantor || context.status !== "awaiting_credit_check") return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t(locale, "fieldRequired"));
      return;
    }
    if (validateEmailFormat(email)) {
      setError(t(locale, "validationInvalidEmail"));
      return;
    }
    if (!phone.trim() || validatePhoneFormat(phone)) {
      setError(t(locale, "validationInvalidPhone"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitAddGuarantor(token, {
        name: trimmedName,
        email: email.trim(),
        phone: phone.trim(),
      });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t(locale, "addGuarantorExpired"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[#78716c]">{t(locale, "loading")}</p>;
  }

  if (!context || context.status !== "awaiting_credit_check") {
    return (
      <p className="rounded border border-[#e7c4c4] bg-[#fdf5f5] px-4 py-3 text-sm text-[#7f1d1d]">
        {error || t(locale, "addGuarantorExpired")}
      </p>
    );
  }

  const subtitle = t(locale, "addGuarantorSubtitle")
    .replace("{id}", String(context.application_id))
    .replace("{building}", context.building_name)
    .replace("{unit}", context.unit_number);

  if (done) {
    return (
      <div>
        <h1 className="text-lg font-semibold text-[#292524]">
          {t(locale, "addGuarantorSuccessTitle")}
        </h1>
        <p className="mt-2 text-sm text-[#57534e]">
          {t(locale, "addGuarantorSuccessBody")}
        </p>
      </div>
    );
  }

  if (context.has_guarantor) {
    return (
      <div>
        <h1 className="text-lg font-semibold text-[#292524]">
          {t(locale, "addGuarantorTitle")}
        </h1>
        <p className="mt-2 text-sm text-[#57534e]">
          {t(locale, "addGuarantorAlready")}
        </p>
      </div>
    );
  }

  const janitorBits = [
    context.janitor_phone?.trim(),
    context.janitor_email?.trim(),
  ].filter(Boolean);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[#292524]">
            {t(locale, "addGuarantorTitle")}
          </h1>
          <p className="mt-1 text-sm text-[#78716c]">{subtitle}</p>
          <p className="mt-1 text-sm text-[#78716c]">{context.building_address}</p>
        </div>
        <button
          type="button"
          onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
          className="shrink-0 text-sm text-[#57534e] underline-offset-2 hover:underline"
        >
          {t(locale, "langToggle")}
        </button>
      </div>

      <p className="text-sm text-[#57534e]">{t(locale, "addGuarantorIntro")}</p>

      {error ? (
        <p className="mt-4 rounded border border-[#e7c4c4] bg-[#fdf5f5] px-4 py-3 text-sm text-[#7f1d1d]">
          {error}
        </p>
      ) : null}

      <form onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-4">
        <label className="block text-sm text-[#57534e]">
          {t(locale, "guarantorName")}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
            required
          />
        </label>
        <label className="block text-sm text-[#57534e]">
          {t(locale, "email")}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            required
          />
        </label>
        <div className="text-sm text-[#57534e]">
          <span className="block">{t(locale, "guarantorPhone")}</span>
          <div className="mt-1">
            <PhoneField locale={locale} value={phone} onChange={setPhone} required />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-[#3d5a45] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? t(locale, "addGuarantorSubmitting") : t(locale, "addGuarantorSubmit")}
        </button>
      </form>

      <p className="mt-6 text-sm text-[#78716c]">{t(locale, "addGuarantorNoGuarantor")}</p>
      {janitorBits.length > 0 ? (
        <p className="mt-1 text-sm text-[#292524]">{janitorBits.join(" · ")}</p>
      ) : null}
    </div>
  );
}
