/** Shared camera-guide frames. ID cards stay CR80; payslips use A4; selfies use portrait. */

/** CR80 / ID-1 card (landscape). */
export const ID_CARD_ASPECT = 85.6 / 53.98;
/** ISO A4 portrait — full-page payslip photos for GPT. */
export const A4_PORTRAIT_ASPECT = 210 / 297;
/** Portrait face crop for identity selfies. */
export const SELFIE_PORTRAIT_ASPECT = 3 / 4;

export type GuidedCaptureFrame = "id" | "a4" | "selfie";

export function guidedCaptureAspect(frame: GuidedCaptureFrame): number {
  if (frame === "a4") return A4_PORTRAIT_ASPECT;
  if (frame === "selfie") return SELFIE_PORTRAIT_ASPECT;
  return ID_CARD_ASPECT;
}
