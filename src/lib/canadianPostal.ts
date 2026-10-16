/** Canadian postal detection — keep in sync with `tal_address.extract_postal_code`. */

export const CA_POSTAL_RE = /[A-Z]\d[A-Z]\s*\d[A-Z]\d/i;

export function hasCanadianPostal(address: string): boolean {
  return CA_POSTAL_RE.test(address);
}

export function formattedAddressWithPostal(
  formatted: string,
  postal?: string | null
): string {
  const text = formatted.trim();
  if (hasCanadianPostal(text)) return text;
  const code = (postal || "").trim();
  if (code && text) return `${text}, ${code}`;
  return text || code;
}

export function isPickedCanadianAddress(
  _address: string,
  placeId?: string | null
): boolean {
  // Require a Places pick. Postal-only free text used to pass and then broke
  // CORPIQ civic parse (app 132: "200.6e avenue… H4G 2Z9").
  return Boolean((placeId || "").trim());
}
