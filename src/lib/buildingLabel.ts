/** Display helpers so applicants see street number with building nicknames. */

/** First comma segment of a full address, e.g. "3400 Av. Linton". */
export function shortCivicAddress(address: string | null | undefined): string {
  const trimmed = (address || "").trim();
  if (!trimmed) return "";
  return trimmed.split(",")[0]?.trim() || trimmed;
}

/**
 * Primary label for building pickers / review.
 * e.g. "Linton — 3400 Av. Linton"
 */
export function buildingLabel(
  name: string,
  address?: string | null
): string {
  const trimmedName = (name || "").trim() || name;
  const civic = shortCivicAddress(address);
  if (!civic) return trimmedName;
  if (civic.toLowerCase() === trimmedName.toLowerCase()) return trimmedName;
  if (trimmedName.toLowerCase().includes(civic.toLowerCase())) {
    return trimmedName;
  }
  return `${trimmedName} - ${civic}`;
}
