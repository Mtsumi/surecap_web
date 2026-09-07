/** Shared camera-guide frames. ID cards stay CR80; payslips use A4. */

/** CR80 / ID-1 card (landscape). */
export const ID_CARD_ASPECT = 85.6 / 53.98;
/** ISO A4 portrait — full-page payslip photos for GPT. */
export const A4_PORTRAIT_ASPECT = 210 / 297;

export type GuidedCaptureFrame = "id" | "a4";

export function guidedCaptureAspect(frame: GuidedCaptureFrame): number {
  return frame === "a4" ? A4_PORTRAIT_ASPECT : ID_CARD_ASPECT;
}
