/** Client-side image compression before uploads (phone camera JPEGs). */

const MAX_EDGE_PX = 1800;
const JPEG_QUALITY = 0.82;
const MAX_OUTPUT_BYTES = 3.5 * 1024 * 1024;

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

/**
 * Resize/compress a camera or gallery image for upload.
 * Non-images are returned unchanged. Falls back to the original file on failure.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }
  // Already small enough — skip work (common for screenshots).
  if (file.size <= 1.2 * 1024 * 1024 && file.type === "image/jpeg") {
    return file;
  }

  try {
    const img = await loadImageFromBlob(file);
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    let quality = JPEG_QUALITY;
    let blob = await canvasToBlob(canvas, "image/jpeg", quality);
    while (blob && blob.size > MAX_OUTPUT_BYTES && quality > 0.45) {
      quality -= 0.1;
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "id-photo";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
