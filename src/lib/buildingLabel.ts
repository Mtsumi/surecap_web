/** Display helpers for building pickers and listings. */

/** First comma segment of a full address, e.g. "3400 Av. Linton". */
export function shortCivicAddress(address: string | null | undefined): string {
  const trimmed = (address || "").trim();
  if (!trimmed) return "";
  return trimmed.split(",")[0]?.trim() || trimmed;
}

/**
 * Primary title for building pickers / listing cards.
 * Steve: name only (e.g. "Linton", "10e avenue"); full address is the subtitle.
 * `address` is accepted for call-site compatibility but not shown in the title.
 */
export function buildingLabel(
  name: string,
  _address?: string | null
): string {
  return (name || "").trim() || name;
}
