export function facebookPeopleSearchUrl(name: string): string | null {
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (!cleaned || !/[A-Za-z0-9]/.test(cleaned)) return null;
  return `https://www.facebook.com/search/people/?q=${encodeURIComponent(cleaned)}`;
}

export function facebookLink(
  url: string | null | undefined,
  name: string
): { href: string; label: string; provided: boolean } | null {
  const provided = url?.trim();
  if (provided) {
    return { href: provided, label: provided, provided: true };
  }
  const search = facebookPeopleSearchUrl(name);
  if (!search) return null;
  return { href: search, label: "Rechercher sur Facebook", provided: false };
}
