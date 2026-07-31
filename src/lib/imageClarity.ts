/** Soft client-side sharpness check for ID photos (Laplacian variance). */

export type ImageClarity = {
  /** Higher = sharper. Typical phone ID photos land ~50–400+. */
  variance: number;
  /** Soft warn only — never blocks upload. */
  looksBlurry: boolean;
};

const BLUR_VARIANCE_THRESHOLD = 45;

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

/**
 * Estimate sharpness via Laplacian variance on a downscaled grayscale sample.
 * Failures return a non-blurry result so upload is never blocked by the check.
 */
export async function assessImageClarity(blob: Blob): Promise<ImageClarity> {
  try {
    const img = await loadImageFromBlob(blob);
    const maxEdge = 320;
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const w = Math.max(2, Math.round(img.width * scale));
    const h = Math.max(2, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { variance: 0, looksBlurry: false };

    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    const gray = new Float32Array(w * h);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    let sum = 0;
    let sumSq = 0;
    let n = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const lap =
          gray[i - w] + gray[i - 1] + gray[i + 1] + gray[i + w] - 4 * gray[i];
        sum += lap;
        sumSq += lap * lap;
        n++;
      }
    }
    if (n === 0) return { variance: 0, looksBlurry: false };
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    return {
      variance,
      looksBlurry: variance < BLUR_VARIANCE_THRESHOLD,
    };
  } catch {
    return { variance: 0, looksBlurry: false };
  }
}
