import type { AddressDatesInput } from "./applyValidation";
import { Locale, t } from "./i18n";

/** Address + tenure fields shared by primary and invitee forms. */
export type AddressDateFormFields = {
  current_address: string;
  current_address_lived_from: string;
  current_address_lived_to: string;
  still_at_current_address: boolean;
  previous_address: string;
  previous_address_lived_from: string;
  previous_address_lived_to: string;
  lease_in_name?: boolean | null;
};

export function toAddressValidationInput(
  fields: AddressDateFormFields,
  options?: { requireLeaseInName?: boolean }
): AddressDatesInput {
  return {
    current_address: fields.current_address,
    current_address_lived_from: fields.current_address_lived_from,
    current_address_lived_to: fields.current_address_lived_to,
    still_at_current_address: fields.still_at_current_address,
    previous_address: fields.previous_address,
    previous_address_lived_from: fields.previous_address_lived_from,
    previous_address_lived_to: fields.previous_address_lived_to,
    lease_in_name: fields.lease_in_name ?? null,
    require_lease_in_name: options?.requireLeaseInName,
  };
}

/** API payload fragment for address tenure (omit empty previous dates). */
export function addressDatePayload(fields: AddressDateFormFields) {
  const previous = fields.previous_address.trim();
  return {
    current_address_lived_from: fields.current_address_lived_from,
    current_address_lived_to: fields.still_at_current_address
      ? undefined
      : fields.current_address_lived_to || undefined,
    previous_address_lived_from: previous ? fields.previous_address_lived_from : undefined,
    previous_address_lived_to: previous ? fields.previous_address_lived_to : undefined,
  };
}

export function formatAddressDateRange(
  locale: Locale,
  from: string,
  to: string | null | undefined
): string {
  if (!from) return "";
  const fromLabel = t(locale, "addressLivedFrom");
  const toLabel = t(locale, "addressLivedTo");
  if (!to) {
    return locale === "fr"
      ? `${fromLabel} ${from} — ${t(locale, "stillAtCurrentAddress").toLowerCase()}`
      : `${fromLabel} ${from} — ${t(locale, "stillAtCurrentAddress").toLowerCase()}`;
  }
  return `${fromLabel} ${from} · ${toLabel} ${to}`;
}
