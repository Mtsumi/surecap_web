import { describe, expect, it } from "vitest";
import {
  documentTypeLabel,
  formatFileSize,
  isImageContentType,
  isPdfContentType,
} from "./adminDocuments";

describe("adminDocuments", () => {
  it("labels known document types in French", () => {
    expect(documentTypeLabel("id_passport")).toBe("Passeport");
    expect(documentTypeLabel("pay_slip_1")).toBe("Talons de paie");
  });

  it("formats file sizes", () => {
    expect(formatFileSize(512)).toBe("512 o");
    expect(formatFileSize(2048)).toBe("2.0 Ko");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 Mo");
  });

  it("detects previewable content types", () => {
    expect(isImageContentType("image/jpeg")).toBe(true);
    expect(isPdfContentType("application/pdf")).toBe(true);
    expect(isImageContentType("application/pdf")).toBe(false);
  });
});
