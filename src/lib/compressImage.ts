/** Client-side image compression before uploads (phone camera JPEGs / HEIC). */

/** Stay under common reverse-proxy defaults (nginx client_max_body_size 1m). */
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.78;
const MAX_OUTPUT_BYTES = 900 * 1024;
const SKIP_IF_ALREADY_UNDER = 850 * 1024;

type DecodedImage = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  close: () => void;
};

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function decodedBitmap(bitmap: ImageBitmap): DecodedImage {
  return {
    width: bitmap.width,
    height: bitmap.height,
    draw: (ctx, width, height) => ctx.drawImage(bitmap, 0, 0, width, height),
    close: () => bitmap.close(),
  };
}

async function decodeImage(blob: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      // from-image keeps camera JPEG EXIF rotation. Do not fall back to
      // createImageBitmap without this option: default "none" stores
      // portrait IDs sideways compared with HTMLImageElement.
      return decodedBitmap(
        await createImageBitmap(blob, { imageOrientation: "from-image" })
      );
    } catch {
      // Unsupported option, or a type this browser cannot bitmap-decode (HEIC on Chrome).
    }
  }
  const img = await loadImageFromBlob(blob);
  return {
    width: img.width,
    height: img.height,
    draw: (ctx, width, height) => ctx.drawImage(img, 0, 0, width, height),
    close: () => undefined,
  };
}

/**
 * Resize/compress a camera or gallery image for upload.
 * Converts HEIC to JPEG when the browser can decode it (Safari/iOS).
 * Non-images are returned unchanged. Falls back to the original file on failure
 * so the API can convert HEIC that this browser cannot read.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }
  // Already small enough for typical nginx 1m limits. HEIC is never image/jpeg,
  // so it always goes through decode (Safari) or falls back for the API.
  if (file.size <= SKIP_IF_ALREADY_UNDER && file.type === "image/jpeg") {
    return file;
  }

  let decoded: DecodedImage | null = null;
  let canvas: HTMLCanvasElement | null = null;
  try {
    decoded = await decodeImage(file);
    let scale = Math.min(1, MAX_EDGE_PX / Math.max(decoded.width, decoded.height));
    let width = Math.max(1, Math.round(decoded.width * scale));
    let height = Math.max(1, Math.round(decoded.height * scale));

    canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    let quality = JPEG_QUALITY;
    let blob: Blob | null = null;

    for (let attempt = 0; attempt < 4; attempt++) {
      canvas.width = width;
      canvas.height = height;
      decoded.draw(ctx, width, height);
      quality = JPEG_QUALITY;
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
      while (blob && blob.size > MAX_OUTPUT_BYTES && quality > 0.4) {
        quality -= 0.1;
        blob = await canvasToBlob(canvas, "image/jpeg", quality);
      }
      if (blob && blob.size <= MAX_OUTPUT_BYTES) break;
      width = Math.max(1, Math.round(width * 0.75));
      height = Math.max(1, Math.round(height * 0.75));
    }

    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "upload";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    decoded?.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

/** Soft client ceiling before POST (proxy may reject above ~1 MiB). */
export const CLIENT_UPLOAD_WARN_BYTES = 10 * 1024 * 1024;

export function uploadFileTooLargeMessage(file: File): string | null {
  if (file.size <= CLIENT_UPLOAD_WARN_BYTES) return null;
  return "File is too large (max 10 MB). Try a smaller photo or PDF.";
}
