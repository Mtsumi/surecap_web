"use client";

import { createContext, useCallback, useContext } from "react";
import { type AdminMessageKey, adminT } from "@/lib/adminI18n";
import { useAdminLocale } from "@/lib/useAdminLocale";
import { useSyncedLocale } from "@/lib/useSyncedLocale";

type AdminLocaleContextValue = ReturnType<typeof useAdminLocale>;

const AdminLocaleContext = createContext<AdminLocaleContextValue | null>(null);

export function AdminLocaleProvider({ children }: { children: React.ReactNode }) {
  const value = useAdminLocale();
  return (
    <AdminLocaleContext.Provider value={value}>{children}</AdminLocaleContext.Provider>
  );
}

export function useAdminLocaleContext(): AdminLocaleContextValue {
  const ctx = useContext(AdminLocaleContext);
  if (!ctx) {
    throw new Error("useAdminLocaleContext must be used within AdminLocaleProvider");
  }
  return ctx;
}

/** Admin shell or sticky locale (review token pages without AdminLocaleProvider). */
export function useAdminCopy(): {
  locale: "fr" | "en";
  setLocale: (next: "fr" | "en") => void;
  t: (key: AdminMessageKey) => string;
} {
  const ctx = useContext(AdminLocaleContext);
  const synced = useSyncedLocale();
  const locale = ctx?.locale ?? synced.locale;
  const setLocale = ctx?.setLocale ?? synced.setLocale;
  const t = useCallback(
    (key: AdminMessageKey) => (ctx ? ctx.t(key) : adminT(locale, key)),
    [ctx, locale]
  );
  return { locale, setLocale, t };
}
