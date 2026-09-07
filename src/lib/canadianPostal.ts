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
  address: string,
  placeId?: string | null
): boolean {
  if ((placeId || "").trim()) return true;
  return hasCanadianPostal(address);
}
