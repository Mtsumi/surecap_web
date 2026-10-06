"use client";

import { useCallback, useEffect, useState } from "react";
import type { Locale } from "./i18n";
import {
  persistLocale,
  resolveInitialLocale,
  syncDocumentLang,
} from "./localePreference";

export function useSyncedLocale() {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    const next = resolveInitialLocale();
    setLocaleState(next);
    syncDocumentLang(next);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    persistLocale(next);
    syncDocumentLang(next);
    setLocaleState(next);
  }, []);

  return { locale, setLocale };
}
