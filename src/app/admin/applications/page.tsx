"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ApplicationListItem,
  BuildingAdmin,
  listApplications,
  listBuildingsAdmin,
} from "@/lib/adminApi";
import { useAdminLocaleContext } from "../AdminLocaleContext";
import { adminUi, applicationStatusClass } from "@/lib/adminUi";
import {
  APPLICATION_STATUSES,
  applicationStatusLabel,
  type ApplicationStatus,
} from "@/lib/adminStatus";

/** Empty string = omit status (API hides drafts). */
type StatusFilter = "" | ApplicationStatus;

function statusBadge(status: string, locale: "fr" | "en") {
  return (
    <span className={applicationStatusClass(status)}>
      {applicationStatusLabel(status, locale)}
    </span>
  );
}

function formatCount(template: string, count: number): string {
  return template
    .replace("{count}", String(count))
    .replace("{plural}", count === 1 ? "" : "s");
}

export default function ApplicationsPage() {
  const { t, locale } = useAdminLocaleContext();
  const [items, setItems] = useState<ApplicationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [buildingId, setBuildingId] = useState<number | null>(null);
  const [buildings, setBuildings] = useState<BuildingAdmin[]>([]);

  useEffect(() => {
    listBuildingsAdmin()
      .then(setBuildings)
      .catch(() => {
        /* Building filter is optional; list still works without it. */
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listApplications({
      limit: 50,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(buildingId ? { building_id: buildingId } : {}),
    })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t("applicationsError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [statusFilter, buildingId, t]);

  const subtitleTemplate = statusFilter
    ? t("applicationsSubtitleFiltered")
    : t("applicationsSubtitleAll");

  const filterOptions: { value: StatusFilter; label: string }[] = [
    { value: "", label: t("applicationsFilterAll") },
    ...APPLICATION_STATUSES.map((status) => ({
      value: status as StatusFilter,
      label: applicationStatusLabel(status, locale),
    })),
  ];

  return (
    <>
      <h1 className={adminUi.pageTitle}>{t("applicationsTitle")}</h1>
      <p className={adminUi.pageSubtitle}>
        {formatCount(subtitleTemplate, total)}
      </p>

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

      {buildings.length > 0 && (
        <label className="mt-4 block max-w-sm">
          <span className={adminUi.fieldLabel}>{t("applicationsBuildingLabel")}</span>
          <select
            className={`${adminUi.input} mt-1 w-full`}
            value={buildingId ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              setBuildingId(raw ? Number(raw) : null);
            }}
          >
            <option value="">{t("applicationsBuildingAll")}</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <p className={`${adminUi.alertError} mt-4`}>{error}</p>}
      {loading && <p className={`${adminUi.empty} mt-6`}>{t("applicationsLoading")}</p>}

      {!loading && items.length === 0 && (
        <p className={`${adminUi.empty} mt-6`}>{t("applicationsEmpty")}</p>
      )}

      <ul className={`${adminUi.list} mt-6`}>
        {items.map((app) => (
          <li key={app.id} className="!p-0">
            <Link
              href={`/admin/applications/${app.id}`}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-[var(--ml-paper)] sm:px-5"
            >
              <div>
                <p className="font-semibold text-[var(--ml-ink)]">
                  #{app.id}{" "}
                  {[app.given_name, app.family_name].filter(Boolean).join(" ") || "—"}
                </p>
                <p className="text-sm text-[var(--ml-steel)]">
                  {app.building_name} · {app.unit_number}
                </p>
              </div>
              {statusBadge(app.status, locale)}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
