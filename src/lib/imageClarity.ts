/** Lightweight client-side blur estimate (Laplacian variance on canvas). */

export type ClarityAssessment = {
  variance: number | null;
  quality: "sharp" | "soft" | "blurry" | "unknown";
  shouldRetake: boolean;
};

const WARN_MIN = 80;
const REJECT_MIN = 45;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
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
 * Estimate sharpness from a downscaled grayscale centre crop.
 * Soft warning only — do not hard-block uploads on false positives.
 */
export async function assessImageClarity(file: Blob): Promise<ClarityAssessment> {
  try {
    const img = await loadImage(file);
    const maxEdge = 320;
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const w = Math.max(8, Math.round(img.width * scale));
    const h = Math.max(8, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return { variance: null, quality: "unknown", shouldRetake: false };
    }
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    const gray = new Float64Array(w * h);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // Centre band (similar to API id_blur region).
    const y0 = Math.floor(h * 0.15);
    const y1 = Math.floor(h * 0.85);
    const x0 = Math.floor(w * 0.05);
    const x1 = Math.floor(w * 0.95);

    let sum = 0;
    let sumSq = 0;
    let n = 0;
    for (let y = y0 + 1; y < y1 - 1; y++) {
      for (let x = x0 + 1; x < x1 - 1; x++) {
        const i = y * w + x;
        const lap =
          -4 * gray[i] +
          gray[i - 1] +
          gray[i + 1] +
          gray[i - w] +
          gray[i + w];
        sum += lap;
        sumSq += lap * lap;
        n++;
      }
    }
    if (n < 16) {
      return { variance: null, quality: "unknown", shouldRetake: false };
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;

    if (variance >= REJECT_MIN * 3) {
      return { variance, quality: "sharp", shouldRetake: false };
    }
    if (variance >= WARN_MIN) {
      return { variance, quality: "soft", shouldRetake: false };
    }
    if (variance >= REJECT_MIN) {
      return { variance, quality: "soft", shouldRetake: false };
    }
    return { variance, quality: "blurry", shouldRetake: true };
  } catch {
    return { variance: null, quality: "unknown", shouldRetake: false };
  }
}
