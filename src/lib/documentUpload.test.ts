import { describe, expect, it } from "vitest";
import {
  ACCEPTED_ID_UPLOAD_TYPES_WITH_PDF,
  ACCEPTED_UPLOAD_TYPES,
} from "./documentUpload";

describe("file-browser accept types", () => {
  it.each([
    ["ID browse", ACCEPTED_ID_UPLOAD_TYPES_WITH_PDF],
    ["income browse", ACCEPTED_UPLOAD_TYPES],
  ])(
    "%s lets the OS file picker show images, not PDF-only documents",
    (_label, accept) => {
      // Android/iOS treat application/pdf as "documents only" and hide photos.
      expect(accept.includes("application/pdf")).toBe(false);
      expect(accept).toMatch(/image\/\*/);
      expect(accept).toMatch(/\.jpg/);
      expect(accept).toMatch(/\.png/);
      expect(accept).toMatch(/\.pdf/);
    }
  );
});
