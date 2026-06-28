import { isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js/min";

const DEFAULT_COUNTRY = "CA";

/** Validate NA (default CA) or international (+…) numbers using Google's libphonenumber rules. */
export function isValidPhone(phone: string): boolean {
  const trimmed = phone.trim();
  if (!trimmed) return false;
  const defaultCountry = trimmed.startsWith("+") ? undefined : DEFAULT_COUNTRY;
  return isValidPhoneNumber(trimmed, defaultCountry);
}

/** E.164 when parseable; otherwise digits-only fallback for equality checks. */
export function normalizePhoneDigits(phone: string): string {
  const trimmed = phone.trim();
  const parsed = parsePhoneNumberFromString(
    trimmed,
    trimmed.startsWith("+") ? undefined : DEFAULT_COUNTRY
  );
  return parsed?.number ?? trimmed.replace(/\D/g, "");
}
