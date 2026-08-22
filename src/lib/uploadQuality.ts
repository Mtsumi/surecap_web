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
