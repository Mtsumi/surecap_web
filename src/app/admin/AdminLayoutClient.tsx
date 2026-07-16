"use client";

import { usePathname } from "next/navigation";
import AdminShell from "./AdminShell";

const AUTH_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"];

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PATHS.some((path) => pathname.startsWith(path));

  if (isAuthPage) {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}
