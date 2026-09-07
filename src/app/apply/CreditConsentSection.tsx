"use client";

import DocusealSign from "./DocusealSign";
import type { CreditConsent } from "@/lib/api";
import { Locale, t } from "@/lib/i18n";

type Props = {
  locale: Locale;
  consent: CreditConsent | null;
  preparing: boolean;
  error: string | null;
  /** True when the server has e-signing disabled — section hides entirely. */
  unavailable: boolean;
  signerEmail?: string;
  signerName?: string;
  onSigned: () => void;
  onRetry: () => void;
};

/**
 * Review-step signing block shared by the apply and invite forms: declaration
 * + credit history search form signed in one embedded DocuSeal session.
 */
export default function CreditConsentSection({
  locale,
  consent,
  preparing,
  error,
  unavailable,
  signerEmail,
  signerName,
  onSigned,
  onRetry,
}: Props) {
  if (unavailable) return null;

  return (
    <section className="mb-5 rounded border border-[#e7e0d5] bg-[#fffef9] px-4 py-4">
      <h3 className="mb-1 text-sm font-medium text-[#292524]">
        {t(locale, "consentTitle")}
      </h3>
      <p className="mb-3 text-sm leading-relaxed text-[#78716c]">
        {t(locale, "consentNote")}
      </p>

      {consent?.signed ? (
        <p
          className="rounded border border-[#c9dcc9] bg-[#f6faf6] px-3 py-2 text-sm text-[#1a3d22]"
          role="status"
        >
          {t(locale, "consentSigned")}
        </p>
      ) : error ? (
        <div role="alert">
          <p className="mb-2 text-sm text-[#b91c1c]">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded border border-[#d6d3d1] px-3 py-1.5 text-sm text-[#44403c] hover:bg-[#f5f5f4]"
          >
            {t(locale, "consentRetry")}
          </button>
        </div>
      ) : preparing || !consent?.slug ? (
        <p className="text-sm text-[#78716c]">{t(locale, "consentPreparing")}</p>
      ) : (
        <DocusealSign
          locale={locale}
          slug={consent.slug}
          email={signerEmail}
          name={signerName}
          onCompleted={onSigned}
        />
      )}
    </section>
  );
}
