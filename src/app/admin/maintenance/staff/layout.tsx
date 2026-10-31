"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminMe } from "@/lib/adminApi";
import { useAdminLocaleContext } from "../../AdminLocaleContext";

export default function MaintenanceStaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useAdminLocaleContext();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminMe()
      .then((me) => {
        if (cancelled) return;
        if (!me.is_super_admin) {
          router.replace("/admin/maintenance");
          return;
        }
        setAllowed(true);
      })
      .catch(() => {
        if (!cancelled) router.replace("/admin/login");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (allowed !== true) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--ml-steel)]">
        {t("loading")}
      </div>
    );
  }

  return <>{children}</>;
}
