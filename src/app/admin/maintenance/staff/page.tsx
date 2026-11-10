"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminLocaleContext } from "../../AdminLocaleContext";
import { adminUi } from "@/lib/adminUi";

/** Phase B: maintenance staff setup lives on Team. */
export default function MaintenanceStaffRedirectPage() {
  const router = useRouter();
  const { t } = useAdminLocaleContext();

  useEffect(() => {
    router.replace("/admin/team");
  }, [router]);

  return (
    <p className="text-sm text-[var(--ml-steel)]">
      {t("maintenanceStaffMovedToTeam")}{" "}
      <a href="/admin/team" className={adminUi.link}>
        {t("navTeam")}
      </a>
    </p>
  );
}
