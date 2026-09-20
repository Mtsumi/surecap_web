"use client";

import { useEffect, useState } from "react";
import { useAdminLocaleContext } from "../AdminLocaleContext";
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

type InsightsData = Record<string, BuildingInsight>;

// ---------- Helpers ----------

const SCRAPER_FORM_URL =
  process.env.NEXT_PUBLIC_SCRAPER_URL
    ? `${process.env.NEXT_PUBLIC_SCRAPER_URL}/scraper-form/`
    : "https://scraper.montrealliving.info/scraper-form/";

/** Returns {h, m} until next 6 AM Montreal time, DST-aware and browser-timezone-agnostic. */
function nextSixAmMontreal(): { h: number; m: number } {
  const now = new Date();

  // Use formatToParts to read Montreal's current hour/minute directly.
  // Avoids new Date(toLocaleString(...)) which parses in the browser's local timezone.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Montreal",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);

  const currentH = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const currentM = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);

  // Minutes from Montreal-midnight to the next 6:00 AM
  const elapsedMin = currentH * 60 + currentM;
  const target6amMin = 6 * 60;
  let diffMin = target6amMin - elapsedMin;
  if (diffMin <= 0) diffMin += 24 * 60; // already past 6 AM — aim for tomorrow

  return { h: Math.floor(diffMin / 60), m: diffMin % 60 };
}

/** True if last_scraped is more than 26 hours ago (buffer over 24h beat). */
function isStale(lastScraped: string | null): boolean {
  if (!lastScraped) return true;
  const age = Date.now() - new Date(lastScraped).getTime();
  return age > 26 * 3600 * 1000;
}

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

// ---------- Building card ----------

function BuildingCard({
  bkey,
  data,
  isSelected,
  onSelect,
  t,
}: {
  bkey: string;
  data: BuildingInsight;
  isSelected: boolean;
  onSelect: () => void;
  t: (k: AdminMessageKey) => string;
}) {
  const hasData = Object.keys(data.by_bedrooms).length > 0;
  const bedKeys = Object.keys(data.by_bedrooms).sort((a, b) => {
    if (a === "studio") return -1;
    if (b === "studio") return 1;
    return Number(a) - Number(b);
  });

  return (
    <div
      role="button"
      tabIndex={0}
      className={`${adminUi.card} cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--ml-pine)] ${
        isSelected ? "ring-2 ring-[var(--ml-pine)]" : ""
      }`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-[var(--ml-ink)]">{data.display_name}</p>
          <p className="mt-0.5 truncate text-xs text-[var(--ml-steel)]">{data.address}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-[var(--ml-steel)]">
            {data.last_scraped
              ? `${t("insightsLastScraped")}: ${data.last_scraped}`
              : t("insightsNeverScraped")}
          </p>
          {data.run_count > 0 && (
            <p className="text-[10px] text-[var(--ml-steel)]">
              {data.run_count} {t("insightsRuns")}
            </p>
          )}
          {isStale(data.last_scraped) && (
            <span className="mt-1 inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
              ⚠ {t("insightsStale")}
            </span>
          )}
        </div>
      </div>

      {hasData ? (
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
                    <td className="px-4 py-2.5 text-right text-[var(--ml-steel)]">{s.count}</td>
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
      ) : (
        <p className="border-t border-[var(--ml-line)] px-4 py-3 text-xs text-[var(--ml-steel)]">
          {t("insightsNoData")}
        </p>
      )}
    </div>
  );
}

// ---------- Comps detail panel ----------

function CompsPanel({
  data,
  t,
}: {
  data: BuildingInsight;
  t: (k: AdminMessageKey) => string;
}) {
  if (!data.top_comps.length) return null;

  return (
    <div className={`${adminUi.card} mt-4`}>
      <p className="px-4 py-3 text-sm font-semibold text-[var(--ml-ink)]">
        {data.display_name} — {t("insightsTopComps")}
      </p>
      <ul className="divide-y divide-[var(--ml-line)]">
        {data.top_comps.map((comp, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-3">
            <div className="shrink-0 text-right">
              <p className="font-semibold text-[var(--ml-ink)]">${comp.price.toLocaleString()}</p>
              <p className="text-xs text-[var(--ml-steel)]">{bedsLabel(comp.beds, t("insightsStudio"))}</p>
              <p className="text-[10px] text-[var(--ml-steel)]">{comp.distance_km} km</p>
            </div>
            <div className="min-w-0 flex-1">
              <a
                href={comp.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-sm font-medium text-[var(--ml-pine)] hover:underline"
              >
                {comp.title || comp.address || "Listing"}
              </a>
              <p className="mt-0.5 truncate text-xs text-[var(--ml-steel)]">{comp.address}</p>
              <div className="mt-1.5 flex gap-1">
                <AmenityDot on={comp.heating} label={t("insightsHeating")} />
                <AmenityDot on={comp.parking} label={t("insightsParking")} />
                <AmenityDot on={comp.air_conditioning} label={t("insightsAC")} />
                <span className="inline-flex rounded bg-[var(--ml-paper)] px-1 py-0.5 text-[9px] uppercase tracking-wide text-[var(--ml-steel)]">
                  {comp.source}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Page ----------

export default function InsightsPage() {
  const { t } = useAdminLocaleContext();
  const [data, setData] = useState<InsightsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastIsError, setToastIsError] = useState(false);
  const [nextRun, setNextRun] = useState(nextSixAmMontreal);

  // Persistent in-progress flag — survives page refresh for up to 35 min
  const SCRAPE_KEY = "scrapeQueuedAt";
  const SCRAPE_TTL_MS = 35 * 60 * 1000;

  const isScrapeInProgress = (): boolean => {
    try {
      const ts = localStorage.getItem(SCRAPE_KEY);
      if (!ts) return false;
      return Date.now() - parseInt(ts, 10) < SCRAPE_TTL_MS;
    } catch { return false; }
  };

  const [scrapeInProgress, setScrapeInProgress] = useState(false);

  // Initialise from localStorage on mount (after hydration)
  useEffect(() => {
    setScrapeInProgress(isScrapeInProgress());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInsights = () => {
    const token = getAdminToken();
    fetch("/api/insights", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setError(json.error as string);
        } else {
          const incoming = json as InsightsData;
          setData(incoming);
          const keys = Object.keys(incoming);
          if (keys.length && !selectedKey) setSelectedKey(keys[0]);

          // Clear the in-progress flag if any building has data scraped
          // after the queued timestamp (scrape completed)
          try {
            const ts = localStorage.getItem(SCRAPE_KEY);
            if (ts) {
              const queuedAt = parseInt(ts, 10);
              const anyFresh = keys.some((k) => {
                const ls = incoming[k]?.last_scraped;
                return ls && new Date(ls).getTime() > queuedAt;
              });
              if (anyFresh || Date.now() - queuedAt >= SCRAPE_TTL_MS) {
                localStorage.removeItem(SCRAPE_KEY);
                setScrapeInProgress(false);
              }
            }
          } catch { /* localStorage unavailable */ }
        }
      })
      .catch(() => setError(t("insightsError")));
  };

  useEffect(() => {
    fetchInsights();
    // Auto-poll every 60s so data refreshes without manual reload
    const pollId = setInterval(fetchInsights, 60_000);
    return () => clearInterval(pollId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep countdown live — recalculate every minute
  useEffect(() => {
    const id = setInterval(() => setNextRun(nextSixAmMontreal()), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    setToast(null);
    setToastIsError(false);
    try {
      const token = getAdminToken();
      const res = await fetch("/api/insights/run-all", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.error) {
        setToastIsError(true);
        setToast(json.error as string);
      } else {
        setToastIsError(false);
        setToast(t("insightsQueued"));
        // Persist in-progress state so button stays disabled across page refreshes
        try {
          localStorage.setItem(SCRAPE_KEY, String(Date.now()));
        } catch { /* ignore */ }
        setScrapeInProgress(true);
      }
    } catch {
      setToastIsError(true);
      setToast(t("insightsError"));
    } finally {
      setRefreshing(false);
      setTimeout(() => setToast(null), 8000);
    }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className={adminUi.pageTitle}>{t("insightsTitle")}</h1>
          <p className="mt-1 text-sm text-[var(--ml-steel)]">{t("insightsSubtitle")}</p>
          <p className="mt-0.5 text-xs text-[var(--ml-steel)]">
            {t("insightsNextRun")}: {t("insightsIn")} {nextRun.h}h {nextRun.m}m
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            disabled={refreshing || scrapeInProgress}
            onClick={() => void handleRefreshAll()}
            className={
              adminUi.btnPrimary +
              " text-sm" +
              (scrapeInProgress ? " cursor-not-allowed opacity-50" : "")
            }
          >
            {refreshing || scrapeInProgress ? t("insightsRefreshing") : t("insightsRefreshAll")}
          </button>
          <a
            href={SCRAPER_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--ml-steel)] underline hover:text-[var(--ml-ink)]"
          >
            {t("insightsRunScrape")}
          </a>
        </div>
      </div>

      {scrapeInProgress && !toast && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <svg className="h-4 w-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          {t("insightsQueued")}
        </div>
      )}

      {toast && (
        <div
          className={`mt-3 rounded-lg px-4 py-2.5 text-sm text-white ${
            toastIsError ? "bg-red-600" : "bg-[var(--ml-pine)]"
          }`}
        >
          {toast}
        </div>
      )}

      {!data && !error && (
        <p className={`${adminUi.empty} mt-8`}>{t("insightsLoading")}</p>
      )}

      {error && (
        <div className={`${adminUi.alertError} mt-6`}>
          {error}
          <a
            href={SCRAPER_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 underline"
          >
            {t("insightsRunScrape")}
          </a>
        </div>
      )}

      {data && Object.keys(data).length === 0 && (
        <div className={`${adminUi.empty} mt-8`}>
          <p>{t("insightsNoData")}</p>
          <a
            href={SCRAPER_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${adminUi.btnPrimary} mt-3 inline-block`}
          >
            {t("insightsRunScrape")}
          </a>
        </div>
      )}

      {data && Object.keys(data).length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {Object.entries(data).map(([bkey, bdata]) => (
            <BuildingCard
              key={bkey}
              bkey={bkey}
              data={bdata}
              isSelected={selectedKey === bkey}
              onSelect={() => setSelectedKey(bkey)}
              t={t}
            />
          ))}
        </div>
      )}

      {data && selectedKey && data[selectedKey] && (
        <CompsPanel data={data[selectedKey]} t={t} />
      )}
    </>
  );
}
