"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminMe } from "@/lib/adminApi";
import { isAdminLoggedIn } from "@/lib/adminAuth";
import { adminHomePath } from "@/lib/maintenanceAdmin";

/** Role-aware landing (PA/APM → applications; staff/MM/worker → maintenance). */
export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      router.replace("/admin/login");
      return;
    }
    adminMe()
      .then((me) => router.replace(adminHomePath(me)))
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  return (
    <div className="admin-app flex min-h-screen items-center justify-center bg-[var(--ml-paper)] text-sm text-[var(--ml-steel)]">
      Loading…
    </div>
  );
}
