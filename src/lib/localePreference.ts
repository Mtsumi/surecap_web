import { detectLocale, type Locale } from "./i18n";

export const LOCALE_STORAGE_KEY = "surecap_locale";
const LEGACY_ADMIN_LOCALE_KEY = "surecap_admin_locale";

function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "fr";
}

export function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
    const legacy = window.sessionStorage.getItem(LEGACY_ADMIN_LOCALE_KEY);
    if (isLocale(legacy)) return legacy;
  } catch {
    return null;
  }
  return null;
}

export function persistLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Private mode / quota — in-memory locale still applies for this page.
  }
}

export function syncDocumentLang(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
}

export function resolveInitialLocale(): Locale {
  return readStoredLocale() ?? detectLocale();
}
