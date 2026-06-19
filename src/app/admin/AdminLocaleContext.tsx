"use client";

import { createContext, useContext } from "react";
import { useAdminLocale } from "@/lib/useAdminLocale";

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
