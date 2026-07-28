/** When OCR/extract cannot support automated conclusions — admin manual-review signals. */

import type { Locale } from "./i18n";
import type {
  IdDocumentExtractPayload,
  IdExtractSummary,
  IncomeDocumentExtractPayload,
} from "./jobMessageFormat";

const INCOME_INCONCLUSIVE_FLAGS = new Set([
  "income_doc_unreadable",
  "payslip_not_recognized",
  "payslip_partial_not_recognized",
  "income_doc_missing",
]);

const ID_INCONCLUSIVE_FLAGS = new Set([
  "name_not_extracted",
  "blur_front",
  "blur_back",
  "barcode_ocr_name_mismatch",
  "no_id_documents",
]);

export type IncomeSlipSummary = {
  document_type?: string;
  read_path?: string;
  payslip_like?: boolean;
  employee_name?: string | null;
  employer_name?: string | null;
  net_pay?: number | null;
  flags?: string[];
};

export function isIncomeExtractInconclusive(
  payload: IncomeDocumentExtractPayload
): boolean {
  if (payload.payslip_like === false) return true;
  return (payload.flags ?? []).some((flag) => INCOME_INCONCLUSIVE_FLAGS.has(flag));
}

export function isIdExtractInconclusive(
  payload: IdDocumentExtractPayload | IdExtractSummary
): boolean {
  if ((payload.flags ?? []).some((flag) => ID_INCONCLUSIVE_FLAGS.has(flag))) {
    return true;
  }
  if (payload.screening_context === "canadian") {
    if (!payload.ocr_name && !payload.barcode_name) return true;
  }
  return false;
}

export function inconclusiveReviewTitle(locale: Locale): string {
  return locale === "fr"
    ? "Vérification manuelle requise"
    : "Manual review required";
}

export function inconclusiveReviewBody(
  kind: "income" | "id",
  locale: Locale
): string {
  if (locale === "fr") {
    if (kind === "income") {
      return "Le système n'a pas pu interpréter ce document comme un talon de paie fiable (ou l'a lu partiellement). Vérifiez le fichier téléversé avant de conclure sur le revenu.";
    }
    return "La pièce d'identité n'a pas fourni assez d'information fiable (nom illisible, photo floue, etc.). Vérifiez le document avant de conclure.";
  }
  if (kind === "income") {
    return "The system could not reliably interpret this file as a payslip (or only partially read it). Review the uploaded document before drawing income conclusions.";
  }
  return "The ID did not yield enough reliable information (unreadable name, blurry photo, etc.). Review the document before drawing conclusions.";
}

export function incomeSlipSlotLabel(
  documentType: string | undefined,
  locale: Locale
): string {
  switch (documentType) {
    case "pay_slip_1":
      return locale === "fr" ? "Talon 1 (plus récent)" : "Slip 1 (most recent)";
    case "pay_slip_2":
      return locale === "fr" ? "Talon 2" : "Slip 2";
    case "pay_slip_3":
      return locale === "fr" ? "Talon 3" : "Slip 3";
    default:
      return documentType || (locale === "fr" ? "Document" : "Document");
  }
}

export function slipRecognizedLabel(
  payslipLike: boolean | undefined,
  locale: Locale
): string {
  if (payslipLike) {
    return locale === "fr" ? "Reconnu comme talon" : "Recognized as payslip";
  }
  return locale === "fr" ? "Non reconnu comme talon" : "Not recognized as payslip";
}
