"use client";

import { Locale, t } from "@/lib/i18n";

type Props = {
  locale: Locale;
  prefix: "current" | "previous";
  livedFrom: string;
  livedTo: string;
  stillLivingHere?: boolean;
  onLivedFromChange: (value: string) => void;
  onLivedToChange: (value: string) => void;
  onStillLivingChange?: (value: boolean) => void;
  inputClassFor: (fieldKey: string) => string;
  fieldHint: (fieldKey: string) => React.ReactNode;
};

export default function AddressLivedDates({
  locale,
  prefix,
  livedFrom,
  livedTo,
  stillLivingHere = false,
  onLivedFromChange,
  onLivedToChange,
  onStillLivingChange,
  inputClassFor,
  fieldHint,
}: Props) {
  const fromKey = `${prefix}_address_lived_from`;
  const toKey = `${prefix}_address_lived_to`;
  const showStillLiving = prefix === "current" && onStillLivingChange;

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#57534e]">{t(locale, "addressLivedHere")}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div id={`apply-field-${fromKey}`}>
          <label className="block text-sm text-[#57534e]">
            {t(locale, "addressLivedFrom")}
            <input
              type="date"
              required
              value={livedFrom}
              onChange={(e) => onLivedFromChange(e.target.value)}
              className={inputClassFor(fromKey)}
            />
          </label>
          {fieldHint(fromKey)}
        </div>
        <div id={`apply-field-${toKey}`}>
          <label className="block text-sm text-[#57534e]">
            {t(locale, "addressLivedTo")}
            <input
              type="date"
              required={!showStillLiving || !stillLivingHere}
              disabled={Boolean(showStillLiving && stillLivingHere)}
              value={stillLivingHere ? "" : livedTo}
              onChange={(e) => onLivedToChange(e.target.value)}
              className={inputClassFor(toKey)}
            />
          </label>
          {fieldHint(toKey)}
        </div>
      </div>
      {showStillLiving && (
        <label className="flex items-start gap-2 text-sm text-[#292524]">
          <input
            type="checkbox"
            checked={stillLivingHere}
            onChange={(e) => onStillLivingChange(e.target.checked)}
            className="mt-1"
          />
          <span>{t(locale, "stillAtCurrentAddress")}</span>
        </label>
      )}
    </div>
  );
}
