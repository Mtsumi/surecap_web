"use client";

import dynamic from "next/dynamic";
import { useAdminLocaleContext } from "../../AdminLocaleContext";
import { adminUi } from "@/lib/adminUi";

const MaintenanceNewClient = dynamic(() => import("./MaintenanceNewClient"), {
  ssr: false,
  loading: () => <MaintenanceNewLoading />,
});

function MaintenanceNewLoading() {
  const { t } = useAdminLocaleContext();
  return (
    <p className={`${adminUi.pageSubtitle} mt-8`}>{t("loading")}</p>
  );
}

export default function MaintenanceNewPage() {
  return <MaintenanceNewClient />;
}
