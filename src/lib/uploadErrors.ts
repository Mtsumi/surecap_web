/** Shared upload error copy and retry helpers. */

export function isBraveBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return "brave" in navigator && !!(navigator as { brave?: unknown }).brave;
}

export function uploadBraveHint(): string {
  return isBraveBrowser()
    ? " If using Brave, turn Shields off for this site and retry."
    : "";
}

export function uploadNetworkErrorMessage(fileDetail?: string): string {
  const extra = fileDetail ? ` File: ${fileDetail}.` : "";
  return (
    `Upload could not complete (connection interrupted). Stay on this tab while uploading, ` +
    `try Wi‑Fi, then retry.${uploadBraveHint()} Limit is about 10 MB.${extra}`
  );
}

export function uploadTimeoutErrorMessage(fileDetail?: string): string {
  const extra = fileDetail ? ` File: ${fileDetail}.` : "";
  return (
    `Upload timed out. Stay on this tab, try Wi‑Fi, then retry.${uploadBraveHint()} ` +
    `Limit is about 10 MB.${extra}`
  );
}

export function isRetryableUploadError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("load failed") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("connection interrupted") ||
    msg.includes("upload timed out")
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
