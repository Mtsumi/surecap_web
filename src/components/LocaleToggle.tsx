"use client";

import type { Locale } from "@/lib/i18n";

export default function LocaleToggle({
  locale,
  onChange,
  variant = "light",
  compact = false,
}: {
  locale: Locale;
  onChange: (next: Locale) => void;
  variant?: "light" | "dark";
  compact?: boolean;
}) {
  const selected =
    variant === "dark"
      ? "bg-white font-semibold text-[#1b2a38]"
      : "bg-[#1c1917] font-semibold text-white";
  const idle =
    variant === "dark" ? "text-[#9AA7B3] hover:text-white" : "text-[#57534e] hover:text-[#1c1917]";
  const wrap =
    variant === "dark"
      ? "border-[#5A6C7E] bg-[#15202b]"
      : "border-[#d6d0c4] bg-[#e8e2d8]";

  if (compact) {
    const next = locale === "fr" ? "en" : "fr";
    return (
      <button
        type="button"
        onClick={() => onChange(next)}
        title={next.toUpperCase()}
        aria-label={`Switch to ${next === "en" ? "English" : "French"}`}
        className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-semibold ${
          variant === "dark"
            ? "text-[#9AA7B3] hover:bg-[#243444] hover:text-white"
            : "text-[#57534e]"
        }`}
      >
        {next.toUpperCase()}
      </button>
    );
  }

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
