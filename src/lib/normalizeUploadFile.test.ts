import { describe, expect, it } from "vitest";
import {
  detectMimeFromBytes,
  describeUploadFile,
  isHeicMime,
  normalizeUploadFile,
} from "./normalizeUploadFile";
import { compressImageForUpload } from "./compressImage";

function ftypBox(major: string, ...compat: string[]): Uint8Array {
  const brands = [major, "\0\0\0\0", ...compat];
  const payload = brands.join("");
  const size = 8 + payload.length;
  const bytes = new Uint8Array(size);
  bytes[0] = (size >> 24) & 0xff;
  bytes[1] = (size >> 16) & 0xff;
  bytes[2] = (size >> 8) & 0xff;
  bytes[3] = size & 0xff;
  bytes.set([0x66, 0x74, 0x79, 0x70], 4);
  for (let i = 0; i < payload.length; i++) {
    bytes[8 + i] = payload.charCodeAt(i);
  }
  return bytes;
}

describe("detectMimeFromBytes", () => {
  it("detects PDF magic", () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]);
    expect(detectMimeFromBytes(bytes)).toBe("application/pdf");
  });

  it("detects JPEG magic", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(detectMimeFromBytes(bytes)).toBe("image/jpeg");
  });

  it("detects HEIC from major brand", () => {
    expect(detectMimeFromBytes(ftypBox("heic", "mif1"))).toBe("image/heic");
  });

  it("detects HEIC from compatible brands when major is mif1", () => {
    expect(detectMimeFromBytes(ftypBox("mif1", "heic"))).toBe("image/heic");
  });

  it("does not treat AVIF as HEIC", () => {
    expect(detectMimeFromBytes(ftypBox("mif1", "avif"))).toBeNull();
    expect(detectMimeFromBytes(ftypBox("avif"))).toBeNull();
  });
});

describe("isHeicMime", () => {
  it("accepts heic and heif aliases", () => {
    expect(isHeicMime("image/heic")).toBe(true);
    expect(isHeicMime("image/heif; codecs=hevc")).toBe(true);
    expect(isHeicMime("image/jpeg")).toBe(false);
  });
});

describe("normalizeUploadFile", () => {
  it("keeps HEIC bytes and sets image/heic", async () => {
    const bytes = ftypBox("heic", "mif1");
    const file = new File([bytes], "IMG_1234.HEIC", { type: "image/heic" });
    const normalized = await normalizeUploadFile(file);
    expect(normalized.type).toBe("image/heic");
    expect(normalized.name.toLowerCase()).toMatch(/\.heic$/);
    expect(normalized.size).toBe(bytes.byteLength);
  });
});

describe("compressImageForUpload", () => {
  it("does not recompress a small JPEG", async () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "id.jpg", {
      type: "image/jpeg",
    });
    expect(await compressImageForUpload(file)).toBe(file);
  });

  it("leaves HEIC unchanged when this runtime cannot decode it", async () => {
    const bytes = ftypBox("heic", "mif1");
    const file = new File([bytes], "id.heic", { type: "image/heic" });
    const out = await compressImageForUpload(file);
    expect(out.type).toBe("image/heic");
    expect(out.size).toBe(file.size);
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
