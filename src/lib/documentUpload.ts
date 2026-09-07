/** ID document upload slots (personal step + invite flow). */

export type IdDocumentKind = "driver_licence" | "medicare" | "passport";

export const ID_DOCUMENT_SLOTS: Record<IdDocumentKind, readonly string[]> = {
  passport: ["id_passport"],
  medicare: ["id_medicare"],
  driver_licence: ["id_driver_licence_front", "id_driver_licence_back"],
};

/**
 * File-browser accept list. Images first; PDF via extension only.
 * Do not include `application/pdf` — Android/iOS then open a documents
 * picker and hide photos from the filesystem.
 */
export const ACCEPTED_UPLOAD_TYPES =
  "image/*,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.pdf";

/** ID / medicare / licence: camera or image only (for the "Take photo" button). */
export const ACCEPTED_ID_UPLOAD_TYPES = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

/** ID documents via file browser — images and PDF scans. */
export const ACCEPTED_ID_UPLOAD_TYPES_WITH_PDF = ACCEPTED_UPLOAD_TYPES;

const ID_TYPES = new Set(
  Object.values(ID_DOCUMENT_SLOTS).flatMap((slots) => [...slots])
);

export function idSlotsForKind(kind: IdDocumentKind): readonly string[] {
  return ID_DOCUMENT_SLOTS[kind];
}

export function idUploadComplete(
  kind: IdDocumentKind,
  uploadedTypes: Iterable<string>
): boolean {
  const uploaded = new Set(uploadedTypes);
  return idSlotsForKind(kind).every((slot) => uploaded.has(slot));
}

export function staleIdDocumentTypes(
  kind: IdDocumentKind,
  documentTypes: Iterable<string>
): string[] {
  const active = new Set(idSlotsForKind(kind));
  return Array.from(documentTypes).filter(
    (type) => type.startsWith("id_") && ID_TYPES.has(type) && !active.has(type)
  );
}
