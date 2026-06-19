"use client";

import { useCallback, useEffect, useState } from "react";
import { type Locale, detectLocale } from "./i18n";
import { type AdminMessageKey, adminT } from "./adminI18n";

const LOCALE_KEY = "surecap_admin_locale";

export function useAdminLocale() {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    const stored = sessionStorage.getItem(LOCALE_KEY);
    if (stored === "en" || stored === "fr") {
      setLocaleState(stored);
      return;
    }
    setLocaleState(detectLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    sessionStorage.setItem(LOCALE_KEY, next);
    setLocaleState(next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "fr" ? "en" : "fr");
  }, [locale, setLocale]);

  const t = useCallback(
    (key: AdminMessageKey) => adminT(locale, key),
    [locale]
  );

  return { locale, setLocale, toggleLocale, t };
}
