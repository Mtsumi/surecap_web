import { MemberDocument } from "@/lib/api";
import { Locale, MessageKey, t } from "@/lib/i18n";

export type UploadQuality = {
  level: "ok" | "warn" | "fail";
  flags: string[];
  message?: string | null;
  upload_generation: number;
};

const FLAG_MESSAGE: Record<string, MessageKey> = {
  id_blurry: "uploadQualityBlurry",
  id_resolution_low: "uploadQualityLowResolution",
  id_unlikely_aspect: "uploadQualityUnlikelyAspect",
  id_not_image: "uploadQualityNotImage",
  payslip_not_recognized: "uploadQualityNotPayslip",
  payslip_no_text_layer: "uploadQualityNoTextLayer",
  payslip_blurry: "uploadQualityBlurry",
  noa_low_text: "uploadQualityNoaLowText",
  noa_blurry: "uploadQualityBlurry",
  quality_warn_after_retry: "uploadQualityRetryFlagged",
};

export function qualityFromDocument(doc: MemberDocument): UploadQuality | null {
  const level = doc.quality_level;
  if (!level || level === "ok") return null;
  return {
    level,
    flags: doc.quality_flags ?? [],
    message: doc.quality_message ?? null,
    upload_generation: doc.upload_generation ?? 1,
  };
}

export function qualityBySlotFromDocuments(
  documents: MemberDocument[]
): Record<string, UploadQuality> {
  const next: Record<string, UploadQuality> = {};
  for (const doc of documents) {
    const quality = qualityFromDocument(doc);
    if (quality) next[doc.document_type] = quality;
  }
  return next;
}

export function mergeMemberDocument(
  documents: MemberDocument[],
  saved: MemberDocument
): MemberDocument[] {
  return [
    ...documents.filter((doc) => doc.document_type !== saved.document_type),
    saved,
  ].sort((a, b) => a.document_type.localeCompare(b.document_type));
}

export function removeMemberDocumentType(
  documents: MemberDocument[],
  documentType: string
): MemberDocument[] {
  return documents.filter((doc) => doc.document_type !== documentType);
}

export function uploadQualityBanner(
  quality: UploadQuality | null | undefined,
  locale: Locale
): string | null {
  if (!quality || quality.level === "ok") return null;
  if (quality.flags.includes("quality_warn_after_retry")) {
    return t(locale, "uploadQualityRetryFlagged");
  }
  const primary = quality.flags.find((flag) => flag !== "quality_warn_after_retry");
  if (primary && FLAG_MESSAGE[primary]) {
    return t(locale, FLAG_MESSAGE[primary]);
  }
  if (quality.message) return quality.message;
  return t(locale, "uploadQualityGeneric");
}

export function uploadQualityTone(
  quality: UploadQuality | null | undefined
): "warn" | "fail" | null {
  if (!quality || quality.level === "ok") return null;
  return quality.level === "fail" ? "fail" : "warn";
}
