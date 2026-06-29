/** Income document upload slots (Income step). */

export type EmploymentType = "employed" | "self_employed" | "other";

export const INCOME_DOCUMENT_SLOTS: Record<EmploymentType, readonly string[]> = {
  employed: ["pay_slip_1"],
  self_employed: ["notice_of_assessment_year_1"],
  other: ["proof_of_income"],
};

const INCOME_TYPES = new Set(
  Object.values(INCOME_DOCUMENT_SLOTS).flatMap((slots) => [...slots])
);

export function incomeSlotsForType(type: EmploymentType): readonly string[] {
  return INCOME_DOCUMENT_SLOTS[type];
}

export function incomeUploadComplete(
  type: EmploymentType,
  uploadedTypes: Iterable<string>
): boolean {
  const uploaded = new Set(uploadedTypes);
  return incomeSlotsForType(type).every((slot) => uploaded.has(slot));
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

export function parseMonthlyNetIncome(value: string): number | null {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}
