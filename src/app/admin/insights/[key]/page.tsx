"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAdminLocaleContext } from "../../AdminLocaleContext";
import { adminUi } from "@/lib/adminUi";
import type { AdminMessageKey } from "@/lib/adminI18n";
import { getAdminToken } from "@/lib/adminAuth";

// ---------- Types ----------

type BedroomSummary = {
  count: number;
  median: number;
  min: number;
  max: number;
  suggested_min: number;
  suggested_max: number;
  trend_pct: number | null;
};

type Comp = {
  beds: string;
  price: number;
  distance_km: number;
  source: string;
  address: string;
  title: string;
  url: string;
  heating: boolean;
  parking: boolean;
  air_conditioning: boolean;
};

type BuildingInsight = {
  display_name: string;
  address: string;
  last_scraped: string | null;
  run_count: number;
  by_bedrooms: Record<string, BedroomSummary>;
  top_comps: Comp[];
};

// ---------- Helpers ----------

function bedsLabel(key: string, studioLabel: string): string {
  if (key === "studio") return studioLabel;
  if (key === "?") return "?";
  return `${key} BR`;
}

function trendBadge(pct: number | null) {
  if (pct === null) return null;
  const up = pct > 0;
  const neutral = pct === 0;
  return (
    <span
      className={`ml-1 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${
        neutral
          ? "bg-[var(--ml-line)] text-[var(--ml-steel)]"
          : up
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {up ? "▲" : pct < 0 ? "▼" : "—"} {Math.abs(pct)}%
    </span>
  );
}

function AmenityDot({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      title={label}
      className={`inline-flex rounded px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide ${
        on
          ? "bg-[var(--ml-pine)] text-white"
          : "bg-[var(--ml-paper)] text-[var(--ml-line)]"
      }`}
    >
      {label}
    </span>
  );
}

function downloadCsv(comps: Comp[], buildingName: string) {
  const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const headers = [
    "Price",
    "Beds",
    "Distance (km)",
    "Source",
    "Title",
    "Address",
    "Heating",
    "Parking",
    "A/C",
    "URL",
  ];
  const rows = comps.map((c) => [
    c.price,
    csvCell(c.beds),
    c.distance_km,
    csvCell(c.source),
    csvCell(c.title || ""),
    csvCell(c.address || ""),
    c.heating ? "Yes" : "No",
    c.parking ? "Yes" : "No",
    c.air_conditioning ? "Yes" : "No",
    csvCell(c.url || ""),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${buildingName.replace(/[^a-z0-9]/gi, "_")}_comps.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Page ----------

export default function BuildingDetailPage() {
  const { key } = useParams<{ key: string }>();
  const { t } = useAdminLocaleContext();
  const [data, setData] = useState<BuildingInsight | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAdminToken();
    fetch(`/api/insights?building=${encodeURIComponent(key)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((json: Record<string, unknown>) => {
        if (json.error) {
          setError(json.error as string);
        } else {
          const building = json[key] as BuildingInsight | undefined;
          if (!building) {
            setError("Building not found.");
          } else {
            setData(building);
          }
        }
      })
      .catch(() => setError(t("insightsError")));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const bedKeys = data
    ? Object.keys(data.by_bedrooms).sort((a, b) => {
        if (a === "studio") return -1;
        if (b === "studio") return 1;
        return Number(a) - Number(b);
      })
    : [];

  return (
    <>
      {/* Back link */}
      <div className="mb-5">
        <Link
          href="/admin/insights"
          className="text-sm text-[var(--ml-steel)] underline hover:text-[var(--ml-ink)]"
        >
          {t("insightsBack")}
        </Link>
      </div>

      {!data && !error && (
        <p className={`${adminUi.empty} mt-8`}>{t("insightsLoading")}</p>
      )}

      {error && (
        <div className={`${adminUi.alertError} mt-6`}>{error}</div>
      )}

      {data && (
        <>
          {/* Building header */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className={adminUi.pageTitle}>{data.display_name}</h1>
              <p className="mt-1 text-sm text-[var(--ml-steel)]">{data.address}</p>
              <p className="mt-0.5 text-xs text-[var(--ml-steel)]">
                {data.last_scraped
                  ? `${t("insightsLastScraped")}: ${data.last_scraped}`
                  : t("insightsNeverScraped")}
                {data.run_count > 0 && ` · ${data.run_count} ${t("insightsRuns")}`}
              </p>
            </div>
            {data.top_comps.length > 0 && (
              <button
                type="button"
                onClick={() => downloadCsv(data.top_comps, data.display_name)}
                className={`${adminUi.btnPrimary} shrink-0 text-sm`}
              >
                {t("insightsDownloadCsv")}
              </button>
            )}
          </div>

          {/* Bedroom summary */}
          {bedKeys.length > 0 && (
            <div className={`${adminUi.card} mb-6`}>
              <p className="px-4 py-3 text-sm font-semibold text-[var(--ml-ink)]">
                {t("insightsSuggested")}
              </p>
              <div className="overflow-x-auto border-t border-[var(--ml-line)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--ml-steel)]">
                      <th className="px-4 py-2">{t("insightsBeds")}</th>
                      <th className="px-4 py-2 text-right">{t("insightsComps")}</th>
                      <th className="px-4 py-2 text-right">{t("insightsMedian")}</th>
                      <th className="px-4 py-2 text-right">{t("insightsRange")}</th>
                      <th className="px-4 py-2 text-right">{t("insightsSuggested")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bedKeys.map((k) => {
                      const s = data.by_bedrooms[k];
                      return (
                        <tr key={k} className="border-t border-[var(--ml-line)]">
                          <td className="px-4 py-2.5 font-medium text-[var(--ml-ink)]">
                            {bedsLabel(k, t("insightsStudio"))}
                            {trendBadge(s.trend_pct)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-[var(--ml-steel)]">
                            {s.count}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-[var(--ml-ink)]">
                            ${s.median.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-[var(--ml-steel)]">
                            ${s.min.toLocaleString()} – ${s.max.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-[var(--ml-pine)]">
                            ${s.suggested_min.toLocaleString()} – ${s.suggested_max.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All comps */}
          {data.top_comps.length > 0 ? (
            <div className={adminUi.card}>
              <p className="px-4 py-3 text-sm font-semibold text-[var(--ml-ink)]">
                {t("insightsAllComps")} ({data.top_comps.length})
              </p>
              <div className="overflow-x-auto border-t border-[var(--ml-line)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--ml-steel)]">
                      <th className="px-4 py-2 text-right">{t("insightsPrice")}</th>
                      <th className="px-4 py-2">{t("insightsBeds")}</th>
                      <th className="px-4 py-2 text-right">{t("insightsDistance")}</th>
                      <th className="px-4 py-2">{t("insightsSource")}</th>
                      <th className="px-4 py-2">{t("insightsAddress")}</th>
                      <th className="px-4 py-2">{t("insightsHeating")}</th>
                      <th className="px-4 py-2">{t("insightsParking")}</th>
                      <th className="px-4 py-2">{t("insightsAC")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_comps.map((comp, i) => (
                      <tr
                        key={i}
                        className="border-t border-[var(--ml-line)] hover:bg-[var(--ml-paper)]"
                      >
                        <td className="px-4 py-2.5 text-right font-semibold text-[var(--ml-ink)]">
                          ${comp.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-[var(--ml-steel)]">
                          {bedsLabel(comp.beds, t("insightsStudio"))}
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-[var(--ml-steel)]">
                          {comp.distance_km} km
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex rounded bg-[var(--ml-paper)] px-1 py-0.5 text-[9px] uppercase tracking-wide text-[var(--ml-steel)]">
                            {comp.source}
                          </span>
                        </td>
                        <td className="max-w-xs px-4 py-2.5">
                          {comp.url ? (
                            <a
                              href={comp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block truncate text-sm text-[var(--ml-pine)] hover:underline"
                            >
                              {comp.title || comp.address || "Listing"}
                            </a>
                          ) : (
                            <span className="truncate text-sm text-[var(--ml-steel)]">
                              {comp.title || comp.address || "—"}
                            </span>
                          )}
                          {comp.address && comp.title && (
                            <p className="mt-0.5 truncate text-[10px] text-[var(--ml-steel)]">
                              {comp.address}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <AmenityDot on={comp.heating} label={t("insightsHeating")} />
                        </td>
                        <td className="px-4 py-2.5">
                          <AmenityDot on={comp.parking} label={t("insightsParking")} />
                        </td>
                        <td className="px-4 py-2.5">
                          <AmenityDot on={comp.air_conditioning} label={t("insightsAC")} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className={`${adminUi.empty} mt-4`}>
              <p>{t("insightsNoData")}</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
