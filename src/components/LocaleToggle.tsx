"use client";

import type { Locale } from "@/lib/i18n";

export default function LocaleToggle({
  locale,
  onChange,
  variant = "light",
}: {
  locale: Locale;
  onChange: (next: Locale) => void;
  variant?: "light" | "dark";
}) {
  const selected =
    variant === "dark"
      ? "bg-[#243444] font-semibold text-white"
      : "bg-white font-semibold text-[#1c1917] shadow-sm";
  const idle =
    variant === "dark" ? "text-[#9AA7B3] hover:text-white" : "text-[#57534e] hover:text-[#1c1917]";
  const wrap =
    variant === "dark"
      ? "border-[#3A4C5E] bg-[#1b2a38]"
      : "border-[#d6d0c4] bg-[#f4f1ec]";

  return (
    <div
      className={`inline-flex rounded-full border p-0.5 text-xs ${wrap}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        aria-pressed={locale === "fr"}
        onClick={() => onChange("fr")}
        className={`rounded-full px-2.5 py-1 ${locale === "fr" ? selected : idle}`}
      >
        FR
      </button>
      <button
        type="button"
        aria-pressed={locale === "en"}
        onClick={() => onChange("en")}
        className={`rounded-full px-2.5 py-1 ${locale === "en" ? selected : idle}`}
      >
        EN
      </button>
    </div>
  );
}
