"use client";

import { useRef, useState } from "react";
import SignaturePad, { SignaturePadHandle } from "./SignaturePad";
import { Locale, t } from "@/lib/i18n";

type Props = {
  locale: Locale;
  signed: boolean;
  signing: boolean;
  error: string | null;
  onSign: (pngDataUrl: string) => void;
};

export default function CreditConsentSection({
  locale,
  signed,
  signing,
  error,
  onSign,
}: Props) {
  const padRef = useRef<SignaturePadHandle | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [emptyError, setEmptyError] = useState(false);

  const handleSign = () => {
    const png = padRef.current?.toPng();
    if (!png) {
      setEmptyError(true);
      return;
    }
    setEmptyError(false);
    onSign(png);
  };

  if (signed) {
    return (
      <section className="mb-5 rounded border border-[#c9dcc9] bg-[#f6faf6] px-4 py-4">
        <p className="text-sm text-[#1a3d22]" role="status">
          {t(locale, "consentSigned")}
        </p>
      </section>
    );
  }

  return (
    <section className="mb-5 rounded border border-[#e7e0d5] bg-[#fffef9] px-4 py-4">
      <h3 className="mb-2 text-sm font-medium text-[#292524]">
        {t(locale, "consentTitle")}
      </h3>
      <p className="mb-4 text-sm leading-relaxed text-[#44403c]">
        {t(locale, "consentBody")}
      </p>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-[#a8a29e]">
        {t(locale, "consentSignLabel")}
      </p>
      <SignaturePad padRef={padRef} disabled={signing} onInkChange={setHasInk} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            padRef.current?.clear();
            setHasInk(false);
            setEmptyError(false);
          }}
          disabled={signing}
          className="rounded border border-[#d6d3d1] px-3 py-1.5 text-sm text-[#44403c] hover:bg-[#f5f5f4] disabled:opacity-60"
        >
          {t(locale, "consentClear")}
        </button>
        <button
          type="button"
          onClick={handleSign}
          disabled={signing || !hasInk}
          className="rounded bg-[#3d5a45] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {signing ? t(locale, "loading") : t(locale, "consentSign")}
        </button>
      </div>
      {(emptyError || error) && (
        <p className="mt-2 text-sm text-[#b91c1c]" role="alert">
          {error || t(locale, "consentEmpty")}
        </p>
      )}
    </section>
  );
}
