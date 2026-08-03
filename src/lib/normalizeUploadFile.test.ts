import { describe, expect, it } from "vitest";
import { detectMimeFromBytes, describeUploadFile } from "./normalizeUploadFile";

describe("detectMimeFromBytes", () => {
  it("detects PDF magic", () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]);
    expect(detectMimeFromBytes(bytes)).toBe("application/pdf");
  });

  it("detects JPEG magic", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(detectMimeFromBytes(bytes)).toBe("image/jpeg");
  });
});

describe("describeUploadFile", () => {
  it("includes size and type", () => {
    const file = new File([new Uint8Array(2048)], "slip.pdf", {
      type: "application/pdf",
    });
    expect(describeUploadFile(file)).toContain("slip.pdf");
    expect(describeUploadFile(file)).toContain("2 KB");
    expect(describeUploadFile(file)).toContain("application/pdf");
  });
});
