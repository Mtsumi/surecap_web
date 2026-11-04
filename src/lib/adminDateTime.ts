/** Montreal/Toronto wall clock for admin timestamps (FR/EN). */

const TORONTO = "America/Toronto";

export function formatAdminDateTime(
  value: string | Date | null | undefined,
  locale: "fr" | "en"
): string | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(locale === "fr" ? "fr-CA" : "en-CA", {
    timeZone: TORONTO,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
