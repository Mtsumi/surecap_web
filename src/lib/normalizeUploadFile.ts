/** Normalize files from mobile pickers before FormData upload. */

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
  // HEIC/HEIF: ISO BMFF with ftyp brand (bytes 4–7 = "ftyp", 8–11 = major brand)
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) {
      return "image/heic";
    }
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
  if (detected === "image/heic") {
    throw new Error(
      "HEIC photos are not supported. Save as JPEG or take a new photo, or use a PDF."
    );
  }

  const declared = (file.type || "").split(";", 1)[0].trim().toLowerCase();
  if (!detected && (declared === "image/heic" || declared === "image/heif")) {
    throw new Error(
      "HEIC photos are not supported. Save as JPEG or take a new photo, or use a PDF."
    );
  }

  const mime =
    detected ||
    (declared && declared !== "application/octet-stream" ? declared : "") ||
    "application/octet-stream";

  if (!detected && mime === "application/octet-stream") {
    throw new Error(
      "Unsupported file. Use a PDF, JPEG, PNG, or WebP payslip/photo."
    );
  }

  // Refuse content types the server cannot accept even if the browser declared them.
  const allowed = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);
  if (!allowed.has(mime)) {
    throw new Error(
      "Unsupported file. Use a PDF, JPEG, PNG, or WebP payslip/photo."
    );
  }

  let name = (file.name || "upload").trim();
  if (!name || name === "image" || name === "blob") {
    name = `upload${extensionForMime(mime) || ""}`;
  } else if (detected && !/\.(pdf|jpe?g|png|webp)$/i.test(name)) {
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
