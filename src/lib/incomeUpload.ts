/** Income document upload slots (Income step). */

import type { MessageKey } from "./i18n";

const PHOTO_CAPTURE_SLOTS = new Set([
  "pay_slip_1",
  "pay_slip_2",
  "pay_slip_3",
  "proof_of_income",
]);

export function incomeSlotSupportsPhotoCapture(slot: string): boolean {
  return PHOTO_CAPTURE_SLOTS.has(slot);
}

export type EmploymentType =
  | "employed"
  | "self_employed"
  | "other"
  | "no_income";

export const INCOME_DOCUMENT_SLOTS: Record<EmploymentType, readonly string[]> = {
  employed: ["pay_slip_1", "pay_slip_2", "pay_slip_3"],
  self_employed: ["notice_of_assessment_year_1", "notice_of_assessment_year_2"],
  other: ["proof_of_income"],
  no_income: [],
};

/** Minimum uploads before the income step is considered complete. */
export const REQUIRED_INCOME_DOCUMENT_SLOTS: Record<
  EmploymentType,
  readonly string[]
> = {
  employed: ["pay_slip_1"],
  self_employed: ["notice_of_assessment_year_1", "notice_of_assessment_year_2"],
  other: ["proof_of_income"],
  no_income: [],
};

const INCOME_TYPES = new Set(
  Object.values(INCOME_DOCUMENT_SLOTS).flatMap((slots) => [...slots])
);

export function employmentRequiresIncome(type: EmploymentType): boolean {
  return type !== "no_income";
}

export function employmentTypeMessageKey(type: EmploymentType): MessageKey {
  switch (type) {
    case "employed":
      return "employmentEmployed";
    case "self_employed":
      return "employmentSelfEmployed";
    case "no_income":
      return "employmentNoIncome";
    default:
      return "employmentOther";
  }
}

export function incomeSlotsForType(type: EmploymentType): readonly string[] {
  return INCOME_DOCUMENT_SLOTS[type];
}

export function requiredIncomeSlotsForType(
  type: EmploymentType
): readonly string[] {
  return REQUIRED_INCOME_DOCUMENT_SLOTS[type];
}

export function isOptionalIncomeSlot(
  type: EmploymentType,
  slot: string
): boolean {
  return (
    incomeSlotsForType(type).includes(slot) &&
    !requiredIncomeSlotsForType(type).includes(slot)
  );
}

export function incomeUploadComplete(
  type: EmploymentType,
  uploadedTypes: Iterable<string>
): boolean {
  if (!employmentRequiresIncome(type)) return true;
  const uploaded = new Set(uploadedTypes);
  return requiredIncomeSlotsForType(type).every((slot) => uploaded.has(slot));
}

export function staleIncomeDocumentTypes(
  type: EmploymentType,
  documentTypes: Iterable<string>
): string[] {
  const active = new Set(incomeSlotsForType(type));
  return Array.from(documentTypes).filter(
    (docType) => INCOME_TYPES.has(docType) && !active.has(docType)
  );
}

/** Normalize locale-specific currency strings to a plain decimal number. */
function normalizeIncomeNumberString(raw: string): string {
  let value = raw.trim().replace(/^\$/, "").replace(/\s/g, "");
  if (!value) return "";

  const hasComma = value.includes(",");
  const hasDot = value.includes(".");

  if (hasComma && !hasDot) {
    // French-style decimal: 3800,50
    value = value.replace(/\./g, "").replace(",", ".");
  } else if (hasComma && hasDot) {
    const lastComma = value.lastIndexOf(",");
    const lastDot = value.lastIndexOf(".");
    if (lastComma > lastDot) {
      value = value.replace(/\./g, "").replace(",", ".");
    } else {
      value = value.replace(/,/g, "");
    }
  } else if (hasDot) {
    const parts = value.split(".");
    if (parts.length > 2) {
      const decimals = parts.pop()!;
      value = `${parts.join("")}.${decimals}`;
    }
  }

  return value;
}

export function parseMonthlyNetIncome(value: string): number | null {
  const normalized = normalizeIncomeNumberString(value);
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function formatMonthlyNetIncome(
  locale: "en" | "fr",
  value: string | number
): string {
  const amount =
    typeof value === "number" ? value : parseMonthlyNetIncome(value);
  if (amount === null) return "";
  return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(amount);
}
