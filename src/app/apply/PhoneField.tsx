"use client";

import PhoneInput from "react-phone-number-input";
import en from "react-phone-number-input/locale/en";
import fr from "react-phone-number-input/locale/fr";
import "react-phone-number-input/style.css";
import { Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  invalid?: boolean;
  id?: string;
};

export default function PhoneField({
  locale,
  value,
  onChange,
  required,
  invalid,
  id,
}: Props) {
  const labels = locale === "fr" ? fr : en;
  const shellClass = invalid
    ? "phone-field phone-field--invalid"
    : "phone-field";

  return (
    <PhoneInput
      id={id}
      international
      defaultCountry="CA"
      countryCallingCodeEditable={false}
      labels={labels}
      value={value || undefined}
      onChange={(next) => onChange(next ?? "")}
      required={required}
      className={shellClass}
      numberInputProps={{
        className: "phone-field__input",
        autoComplete: "tel",
      }}
    />
  );
}
