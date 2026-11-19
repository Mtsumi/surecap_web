"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditConsentSignContext,
  fetchCreditConsentSignContext,
  signCreditConsentViaToken,
} from "@/lib/api";
import CreditConsentSection from "@/app/apply/CreditConsentSection";
import LocaleToggle from "@/components/LocaleToggle";
import { formatClientFetchError } from "@/lib/clientFetchError";
import { Locale, t } from "@/lib/i18n";

export default function CreditConsentSignForm({ token }: { token: string }) {
  const [locale, setLocale] = useState<Locale>("fr");
  const [ctx, setCtx] = useState<CreditConsentSignContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCreditConsentSignContext(token)
      .then((data) => {
        if (!cancelled) {
          setCtx(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            formatClientFetchError(err, "fr", t("fr", "creditSignInvalid"))
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const place = useMemo(() => {
    if (!ctx) return "";
    return [ctx.building_name, ctx.unit_number].filter(Boolean).join(" · ");
  }, [ctx]);

  async function onSign(pngDataUrl: string) {
    setSigning(true);
    setSignError(null);
    try {
      const updated = await signCreditConsentViaToken(token, pngDataUrl);
      setCtx(updated);
    } catch (err: unknown) {
      setSignError(
        formatClientFetchError(err, locale, t(locale, "consentError"))
      );
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[#78716c]">{t(locale, "loading")}</p>;
  }

  if (!ctx) {
    return (
      <div>
        <div className="mb-4 flex justify-end">
          <LocaleToggle locale={locale} onChange={setLocale} />
        </div>
        <p className="text-sm text-[#b91c1c]" role="alert">
          {error || t(locale, "creditSignInvalid")}
        </p>
      </div>
    );
  }

  const signed = ctx.signed;
  const closed = ctx.application_closed;
  const canSign = ctx.can_sign;

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#a8a29e]">
            Montreal Living
          </p>
          <h1 className="mt-1 text-xl font-semibold text-[#1c1917]">
            {t(locale, "creditSignPageTitle")}
          </h1>
          <p className="mt-1 text-sm text-[#57534e]">
            {t(locale, "creditSignPlace")
              .replace("{name}", ctx.member_name)
              .replace("{place}", place || "—")}
          </p>
        </div>
        <LocaleToggle locale={locale} onChange={setLocale} />
      </div>

      {closed ? (
        <p className="rounded border border-[#e7e0d5] bg-[#fffef9] px-4 py-3 text-sm text-[#44403c]">
          {t(locale, "creditSignClosed")}
        </p>
      ) : signed ? (
        <p
          className="rounded border border-[#c9dcc9] bg-[#f6faf6] px-4 py-3 text-sm text-[#1a3d22]"
          role="status"
        >
          {t(locale, "creditSignDone")}
        </p>
      ) : !canSign ? (
        <p className="rounded border border-[#e7e0d5] bg-[#fffef9] px-4 py-3 text-sm text-[#44403c]">
          {t(locale, "creditSignUnavailable")}
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm leading-relaxed text-[#44403c]">
            {t(locale, "creditSignIntro")}
          </p>
          <CreditConsentSection
            locale={locale}
            signed={false}
            signing={signing}
            error={signError}
            onSign={onSign}
          />
        </>
      )}
    </div>
  );
}
