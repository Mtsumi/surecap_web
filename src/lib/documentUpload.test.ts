import { describe, expect, it } from "vitest";
import {
  ACCEPTED_ID_UPLOAD_TYPES,
  ACCEPTED_ID_UPLOAD_TYPES_WITH_PDF,
  ACCEPTED_UPLOAD_TYPES,
} from "./documentUpload";

describe("file-browser accept types", () => {
  it("income browse lets the OS file picker show images, not PDF-only documents", () => {
    // Android/iOS treat application/pdf as "documents only" and hide photos.
    expect(ACCEPTED_UPLOAD_TYPES.includes("application/pdf")).toBe(false);
    expect(ACCEPTED_UPLOAD_TYPES).toMatch(/image\/\*/);
    expect(ACCEPTED_UPLOAD_TYPES).toMatch(/\.jpg/);
    expect(ACCEPTED_UPLOAD_TYPES).toMatch(/\.png/);
    expect(ACCEPTED_UPLOAD_TYPES).toMatch(/\.pdf/);
    expect(ACCEPTED_UPLOAD_TYPES).toMatch(/\.heic/);
  });

  it("ID capture accepts camera images only (no PDF)", () => {
    expect(ACCEPTED_ID_UPLOAD_TYPES).toMatch(/image\/heic/);
    expect(ACCEPTED_ID_UPLOAD_TYPES).toMatch(/\.heic/);
    expect(ACCEPTED_ID_UPLOAD_TYPES.includes("application/pdf")).toBe(false);
    expect(ACCEPTED_ID_UPLOAD_TYPES).not.toMatch(/\.pdf/);
    expect(ACCEPTED_ID_UPLOAD_TYPES).not.toMatch(/image\/\*/);
  });

  it("ID browse accepts images and PDF scans", () => {
    expect(ACCEPTED_ID_UPLOAD_TYPES_WITH_PDF).toBe(ACCEPTED_UPLOAD_TYPES);
    expect(ACCEPTED_ID_UPLOAD_TYPES_WITH_PDF).toMatch(/\.pdf/);
    expect(ACCEPTED_ID_UPLOAD_TYPES_WITH_PDF).toMatch(/image\/\*/);
  });
});
