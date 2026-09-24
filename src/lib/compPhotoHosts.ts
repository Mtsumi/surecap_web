/** Hostnames allowed for comp photo proxy (Kijiji + Facebook CDN only). */
export function isAllowedCompPhotoUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const h = parsed.hostname.toLowerCase();
  if (h === "media.kijiji.ca" || h.endsWith(".kijiji.ca")) return true;
  if (h.endsWith("fbcdn.net")) return true;
  return false;
}

export function compPhotoProxyPath(originalUrl: string): string {
  return `/api/insights/comp-photo?url=${encodeURIComponent(originalUrl)}`;
}
