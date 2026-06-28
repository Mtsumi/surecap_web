/** ID document upload slots (STEVE-S2 — primary post-submit flow). */

export type IdDocumentKind = "driver_licence" | "medicare" | "passport";

export const ID_DOCUMENT_SLOTS: Record<IdDocumentKind, readonly string[]> = {
  passport: ["id_passport"],
  medicare: ["id_medicare"],
  driver_licence: ["id_driver_licence_front", "id_driver_licence_back"],
};

export const ACCEPTED_UPLOAD_TYPES =
  "application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp";
