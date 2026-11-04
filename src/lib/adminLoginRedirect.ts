/** Safe post-login redirect for admin deep links (email, bookmarks). */
export function safeAdminLoginNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const path = raw.trim();
  if (!path.startsWith("/admin/")) return null;
  if (path.startsWith("/admin/login")) return null;
  if (path.includes("//") || path.includes("\\")) return null;
  return path;
}

export function adminLoginHref(returnPath: string): string {
  return `/admin/login?next=${encodeURIComponent(returnPath)}`;
}
