"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BuildingAdmin,
  MaintenanceTicket,
  adminMe,
  listBuildingsAdmin,
  listMaintenanceTickets,
} from "@/lib/adminApi";
import { useAdminLocaleContext } from "../AdminLocaleContext";
import { adminUi } from "@/lib/adminUi";
import { formatAdminFetchError } from "@/lib/adminFetchError";
import {
  MAINTENANCE_STATUSES,
  buildingsForMaintenanceUser,
  maintenanceCategoryLabel,
  maintenanceStatusClass,
  maintenanceStatusLabel,
} from "@/lib/maintenanceAdmin";

type StatusFilter = "" | (typeof MAINTENANCE_STATUSES)[number];

function formatCount(template: string, count: number): string {
  return template.replace("{count}", String(count));
}

function locationLabel(ticket: MaintenanceTicket): string {
  if (ticket.location_kind === "unit") {
    return ticket.unit_number ? `#${ticket.unit_number}` : "—";
  }
  return ticket.location_label || "—";
}

export default function MaintenanceListPage() {
  const { t, locale } = useAdminLocaleContext();
  const [items, setItems] = useState<MaintenanceTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [buildingId, setBuildingId] = useState<number | null>(null);
  const [buildings, setBuildings] = useState<BuildingAdmin[]>([]);
  const [isSuper, setIsSuper] = useState(false);
  const [meLoaded, setMeLoaded] = useState(false);

  useEffect(() => {
    adminMe()
      .then((u) => {
        setIsSuper(u.is_super_admin);
        return listBuildingsAdmin().then((all) =>
          setBuildings(buildingsForMaintenanceUser(u, all))
        );
      })
      .catch(() => {})
      .finally(() => setMeLoaded(true));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listMaintenanceTickets({
      limit: 100,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(buildingId ? { building_id: buildingId } : {}),
    })
      .then((data) => {
        if (cancelled) return;
        setItems(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setItems([]);
        setError(formatAdminFetchError(e, locale, t("maintenanceError")));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter, buildingId, locale, t]);

  const filterOptions: { value: StatusFilter; label: string }[] = [
    { value: "", label: t("maintenanceFilterAll") },
    ...MAINTENANCE_STATUSES.map((status) => ({
      value: status as StatusFilter,
      label: maintenanceStatusLabel(status, locale),
    })),
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={adminUi.pageTitle}>{t("maintenanceTitle")}</h1>
          <p className={adminUi.pageSubtitle}>
            {formatCount(t("maintenanceSubtitle"), items.length)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/maintenance/new" className={adminUi.btnPrimary}>
            {t("maintenanceNewTicket")}
          </Link>
          {isSuper ? (
            <Link href="/admin/maintenance/staff" className={adminUi.btnSecondary}>
              {t("maintenanceStaff")}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {filterOptions.map((opt) => (
          <button
            key={opt.value || "all"}
            type="button"
            onClick={() => setStatusFilter(opt.value)}
            className={
              statusFilter === opt.value ? adminUi.chipActive : adminUi.chip
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {buildings.length > 0 && meLoaded ? (
        <label className="mt-4 block max-w-xs text-sm text-[var(--ml-steel)]">
          {t("maintenanceFilterBuilding")}
          <select
            className={adminUi.input + " mt-1"}
            value={buildingId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setBuildingId(v ? Number(v) : null);
            }}
          >
            <option value="">{t("maintenanceFilterAnyBuilding")}</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {error ? <p className={`${adminUi.alertError} mt-4`}>{error}</p> : null}
      {loading ? (
        <p className="mt-6 text-sm text-[var(--ml-steel)]">{t("loading")}</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--ml-steel)]">{t("maintenanceEmpty")}</p>
      ) : (
        <ul className={`${adminUi.list} mt-6`}>
          {items.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/admin/maintenance/${ticket.id}`}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--ml-ink)]">
                    #{ticket.id} · {ticket.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--ml-steel)]">
                    {ticket.building_name ?? ticket.building_id} ·{" "}
                    {locationLabel(ticket)} ·{" "}
                    {maintenanceCategoryLabel(ticket.category, locale)}
                    {ticket.urgent ? ` · ${t("maintenanceUrgentYes")}` : ""}
                  </p>
                </div>
                <span className={maintenanceStatusClass(ticket.status)}>
                  {maintenanceStatusLabel(ticket.status, locale)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
