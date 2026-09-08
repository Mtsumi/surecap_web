/** Normalize files from mobile pickers before FormData upload. */

const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif"]);
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs"]);
const HEIF_GENERIC_BRANDS = new Set(["mif1", "msf1"]);
const AVIF_BRANDS = new Set(["avif", "avis", "avio", "av01"]);

export function isHeicMime(mime: string): boolean {
  return HEIC_MIME_TYPES.has(mime.split(";", 1)[0].trim().toLowerCase());
}

function ftypBrands(bytes: Uint8Array): string[] {
  if (
    bytes.length < 16 ||
    bytes[4] !== 0x66 ||
    bytes[5] !== 0x74 ||
    bytes[6] !== 0x79 ||
    bytes[7] !== 0x70
  ) {
    return [];
  }
  const boxSize =
    ((bytes[0] << 24) >>> 0) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  const end = boxSize === 0 ? bytes.length : Math.min(bytes.length, Math.max(boxSize, 16));
  const brands: string[] = [];
  const pushBrand = (offset: number) => {
    if (offset + 4 > end) return;
    brands.push(
      String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]).toLowerCase()
    );
  };
  pushBrand(8);
  for (let offset = 16; offset + 4 <= end; offset += 4) {
    pushBrand(offset);
  }
  return brands;
}

function looksLikeHeic(bytes: Uint8Array): boolean {
  const brands = ftypBrands(bytes);
  if (brands.length === 0) return false;
  if (brands.some((brand) => AVIF_BRANDS.has(brand))) return false;
  return brands.some((brand) => HEIC_BRANDS.has(brand) || HEIF_GENERIC_BRANDS.has(brand));
}

export function detectMimeFromBytes(bytes: Uint8Array): string | null {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "application/pdf";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (looksLikeHeic(bytes)) {
    return "image/heic";
  }
  return null;
}

function extensionForMime(mime: string): string {
  switch (mime) {
    case "application/pdf":
      return ".pdf";
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/heic":
    case "image/heif":
      return ".heic";
    default:
      return "";
  }
}

/**
 * Fully read the file into memory and re-wrap with a correct MIME type.
 *
 * Android content:// pickers often give empty/wrong type, and the underlying
 * handle can become unreadable after the file chooser closes — reading early
 * avoids a mid-upload failure that shows up as a network "Load failed".
 */
export async function normalizeUploadFile(file: File): Promise<File> {
  // Do not gate on file.size — Android content:// picks often report 0 until read.
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new Error(
      "Could not read the selected file. On Android, try Files → share as PDF, or take a photo of the slip."
    );
  }

  if (buffer.byteLength <= 0) {
    throw new Error("That file is empty. Try exporting the payslip as a PDF or photo again.");
  }

  const bytes = new Uint8Array(buffer);
  const detected = detectMimeFromBytes(bytes);
  const declared = (file.type || "").split(";", 1)[0].trim().toLowerCase();

  const mime =
    detected ||
    (declared && declared !== "application/octet-stream" ? declared : "") ||
    "application/octet-stream";

  if (!detected && mime === "application/octet-stream") {
    throw new Error(
      "Unsupported file. Use a PDF, JPEG, PNG, WebP, or HEIC payslip/photo."
    );
  }

  // Refuse content types the server cannot accept even if the browser declared them.
  const allowed = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ]);
  if (!allowed.has(mime)) {
    throw new Error(
      "Unsupported file. Use a PDF, JPEG, PNG, WebP, or HEIC payslip/photo."
    );
  }

  let name = (file.name || "upload").trim();
  if (!name || name === "image" || name === "blob") {
    name = `upload${extensionForMime(mime) || ""}`;
  } else if (detected && !/\.(pdf|jpe?g|png|webp|heic|heif)$/i.test(name)) {
    name = `${name.replace(/\.[^.]+$/, "")}${extensionForMime(detected)}`;
  }

  return new File([buffer], name, {
    type: mime,
    lastModified: Date.now(),
  });
}

export function describeUploadFile(file: File): string {
  const kb = Math.max(1, Math.round(file.size / 1024));
  const type = file.type || "unknown";
  return `${file.name || "file"} (${kb} KB, ${type})`;
}
