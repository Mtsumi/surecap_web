"use client";

import { useEffect, useRef, useState } from "react";
import type { AdminMessageKey } from "@/lib/adminI18n";
import type { BuildingAdmin, UnitAdmin } from "@/lib/adminApi";
import { getAdminToken } from "@/lib/adminAuth";
import { compPhotoProxyPath } from "@/lib/compPhotoHosts";

export type AmenitySplit = {
  key: string;
  premium: number;
  n_with: number;
  n_without: number;
};

export type BedroomSummary = {
  count: number;
  median: number;
  min: number;
  max: number;
  suggested_min: number;
  suggested_max: number;
  trend_pct: number | null;
  median_prev?: number | null;
  prev_count?: number | null;
  amenity_splits?: AmenitySplit[];
};

export type Comp = {
  beds: string;
  price: number;
  distance_km: number;
  source: string;
  address: string;
  title: string;
  url: string;
  square_feet: number | null;
  image: string;
  images?: string[];
  heating: boolean;
  parking: boolean;
  parking_type: string;
  air_conditioning: boolean;
  laundry_in_unit: boolean;
  furnished: boolean;
  electricity_included: boolean;
  dishwasher: boolean;
  balcony: boolean;
  fridge_freezer?: boolean;
  stove_included?: boolean;
  microwave?: boolean;
  water_included?: boolean;
  concierge?: boolean;
  bike_parking?: boolean;
};

export type BuildingInsight = {
  display_name: string;
  address: string;
  last_scraped: string | null;
  run_count: number;
  by_bedrooms: Record<string, BedroomSummary>;
  top_comps: Comp[];
};

export const ASK_BAND = 100;

export function bedsLabel(key: string, studioLabel: string): string {
  if (key === "studio") return studioLabel;
  if (key === "?") return "?";
  return `${key} BR`;
}

export function photoUrls(comp: Comp): string[] {
  if (comp.images && comp.images.length) return comp.images.filter(Boolean);
  return comp.image ? [comp.image] : [];
}

export function AmenityChip({
  on,
  label,
  tip,
}: {
  on?: boolean;
  label: string;
  tip: string;
}) {
  if (!on) return null;
  return (
    <span
      title={tip}
      className="inline-flex rounded bg-[var(--ml-pine)] px-1.5 py-0.5 text-[10px] font-medium text-white"
    >
      {label}
    </span>
  );
}

export function CompPhotos({
  images,
  alt,
  listingUrl,
  viewLabel,
  prevLabel,
  nextLabel,
  openLabel,
  closeLabel,
}: {
  images: string[];
  alt: string;
  listingUrl?: string;
  viewLabel: string;
  prevLabel: string;
  nextLabel: string;
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [broken, setBroken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const urls = images.filter(Boolean);
  const closeViewer = () => {
    setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  };
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeViewer();
        return;
      }
      if (e.key === "ArrowLeft") {
        setBroken(false);
        setI((cur) => cur - 1);
        return;
      }
      if (e.key === "ArrowRight") {
        setBroken(false);
        setI((cur) => cur + 1);
        return;
      }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button, a[href], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const n = urls.length;
  const src = n ? urls[((i % n) + n) % n] : "";

  useEffect(() => {
    if (!open || !src) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setBroken(false);
    setDisplaySrc(null);
    const token = getAdminToken();
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 16_000);
    fetch(compPhotoProxyPath(src), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        if (!blob.type.startsWith("image/")) throw new Error("not-image");
        objectUrl = URL.createObjectURL(blob);
        setDisplaySrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setBroken(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
        window.clearTimeout(timer);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, src]);

  if (!urls.length) return null;
  const label = viewLabel.replace("{count}", String(n));

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="whitespace-nowrap text-xs text-[var(--ml-pine)] underline hover:text-[var(--ml-ink)]"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setBroken(false);
          setI(0);
          setOpen(true);
        }}
      >
        {label}
      </button>
      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={alt || label}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closeViewer}
        >
          <div
            className="relative w-full max-w-3xl rounded bg-black p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 z-10 rounded bg-white/90 px-2 py-1 text-xs text-[var(--ml-ink)]"
              onClick={closeViewer}
            >
              {closeLabel}
            </button>
            {broken ? (
              <div className="flex h-72 flex-col items-center justify-center gap-2 text-sm text-white">
                {listingUrl ? (
                  <a
                    href={listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {openLabel}
                  </a>
                ) : (
                  <span>{alt}</span>
                )}
              </div>
            ) : loading || !displaySrc ? (
              <div className="flex h-72 items-center justify-center text-sm text-white/80">
                …
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displaySrc}
                alt={alt}
                className="max-h-[75vh] w-full object-contain"
                onError={() => setBroken(true)}
              />
            )}
            <div className="mt-2 flex items-center justify-between text-xs text-white">
              <span>
                {(((i % n) + n) % n) + 1}/{n}
              </span>
              <div className="flex gap-2">
                {n > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label={prevLabel}
                      onClick={() => {
                        setBroken(false);
                        setI((c) => c - 1);
                      }}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      aria-label={nextLabel}
                      onClick={() => {
                        setBroken(false);
                        setI((c) => c + 1);
                      }}
                    >
                      ›
                    </button>
                  </>
                )}
                {listingUrl && (
                  <a
                    href={listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {openLabel}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function trendTitle(
  s: BedroomSummary,
  t: (k: AdminMessageKey) => string
): string {
  if (s.median_prev == null) return "";
  let title = t("insightsTrendVs")
    .replace("{prev}", s.median_prev.toLocaleString())
    .replace("{now}", s.median.toLocaleString());
  if (s.prev_count != null && s.prev_count < 5) {
    title = `${title} ${t("insightsTrendThin")}`;
  }
  return title;
}

export function TrendBadge({
  summary,
  t,
}: {
  summary: BedroomSummary;
  t: (k: AdminMessageKey) => string;
}) {
  const title = trendTitle(summary, t);
  const thin = summary.prev_count != null && summary.prev_count < 5;
  if (thin || summary.trend_pct == null) {
    return (
      <span
        title={title || t("insightsTrendNoneTip")}
        className="ml-1 inline-flex items-center rounded bg-[var(--ml-line)] px-1.5 py-0.5 text-[10px] text-[var(--ml-steel)]"
      >
        {t("insightsTrendNone")}
      </span>
    );
  }
  const pct = summary.trend_pct;
  const up = pct > 0;
  const neutral = pct === 0;
  return (
    <span
      title={title}
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

const AMENITY_I18N: Record<string, AdminMessageKey> = {
  parking: "insightsParking",
  laundry_in_unit: "insightsLaundry",
  furnished: "insightsFurnished",
  air_conditioning: "insightsAC",
  dishwasher: "insightsDishwasher",
  balcony: "insightsBalcony",
  electricity_included: "insightsElectricity",
  heating: "insightsHeating",
  fridge_freezer: "insightsFridge",
  stove_included: "insightsStove",
  microwave: "insightsMicrowave",
  water_included: "insightsWater",
};

export function amenitySplitLines(
  splits: AmenitySplit[] | undefined,
  t: (k: AdminMessageKey) => string
): string[] {
  if (!splits?.length) return [];
  return splits.map((s) => {
    const label = t(AMENITY_I18N[s.key] ?? "insightsAmenities");
    const amount = Math.abs(s.premium).toLocaleString();
    const key = s.premium >= 0 ? "insightsAmenityMore" : "insightsAmenityLess";
    return t(key).replace("{amenity}", label).replace("{amount}", amount);
  });
}

export function AmenitySplitChips({
  splits,
  t,
  heading,
  compact,
}: {
  splits: AmenitySplit[] | undefined;
  t: (k: AdminMessageKey) => string;
  heading?: string;
  compact?: boolean;
}) {
  if (!splits?.length) return null;
  return (
    <div className={compact ? "mt-2" : "mt-3"}>
      {!compact && (
        <>
          <p className="text-xs font-semibold text-[var(--ml-ink)]">
            {heading ?? t("insightsAmenityMarket")}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--ml-steel)]">
            {t("insightsAmenityHint")}
          </p>
        </>
      )}
      {compact && heading && (
        <p className="text-[11px] font-medium text-[var(--ml-ink)]">{heading}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {splits.map((s) => {
          const label = t(AMENITY_I18N[s.key] ?? "insightsAmenities");
          const amount = Math.abs(s.premium).toLocaleString();
          const more = s.premium >= 0;
          const chip = t(more ? "insightsAmenityChipMore" : "insightsAmenityChipLess")
            .replace("{amenity}", label)
            .replace("{amount}", amount);
          return (
            <span
              key={s.key}
              title={t("insightsAmenityHint")}
              className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ${
                more
                  ? "bg-[var(--ml-paper)] text-[var(--ml-pine)]"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {chip}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function postalOf(s: string): string | null {
  const m = s
    .toUpperCase()
    .replace(/\s+/g, " ")
    .match(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/);
  return m ? m[0].replace(/\s/g, "") : null;
}

function civicNumber(s: string): string | null {
  const m = s.match(/\d+/);
  return m ? m[0] : null;
}

function streetToken(s: string, civic: string | null): string | undefined {
  return fold(s)
    .split(" ")
    .find((w) => w.length > 3 && w !== civic);
}

function nameOverlaps(insightName: string, buildingName: string): boolean {
  const a = fold(insightName);
  const b = fold(buildingName);
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
}

function addressCorroborates(
  insight: { display_name: string; address: string },
  building: BuildingAdmin
): boolean {
  const civic = civicNumber(insight.address);
  const street = streetToken(insight.address, civic);
  const ba = fold(building.address);
  const civicOk = Boolean(civic && ba.includes(civic));
  const streetOk = Boolean(street && ba.includes(street));
  const nameOk = nameOverlaps(insight.display_name, building.name);
  return (civicOk && streetOk) || (civicOk && nameOk) || (streetOk && nameOk);
}

export function matchInventoryBuilding(
  insight: { display_name: string; address: string },
  buildings: BuildingAdmin[]
): BuildingAdmin | null {
  const corroborated = buildings.filter((b) => addressCorroborates(insight, b));
  const postal = postalOf(insight.address);
  if (postal) {
    const byPostal = corroborated.filter((b) => postalOf(b.address) === postal);
    if (byPostal.length === 1) return byPostal[0];
    if (byPostal.length > 1) {
      const civic = civicNumber(insight.address);
      const street = streetToken(insight.address, civic);
      const hit = byPostal.find((b) => {
        const ba = fold(b.address);
        return Boolean(civic && ba.includes(civic) && street && ba.includes(street));
      });
      if (hit) return hit;
    }
  }
  if (corroborated.length === 1) return corroborated[0];
  return null;
}

export function unitBedsKey(unit: UnitAdmin): string {
  const raw = unit.amenities?.bedrooms;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (Number.isNaN(n)) return "?";
  if (n === 0) return "studio";
  return n === Math.floor(n) ? String(n) : String(n);
}

export function downloadCsv(comps: Comp[], buildingName: string) {
  const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const headers = [
    "Price",
    "Beds",
    "Distance (km)",
    "Sqft",
    "Source",
    "Title",
    "Address",
    "Heating",
    "Parking",
    "Parking type",
    "A/C",
    "Laundry in unit",
    "Furnished",
    "Electricity included",
    "Dishwasher",
    "Balcony",
    "Photos",
    "URL",
  ];
  const rows = comps.map((c) => [
    c.price,
    csvCell(c.beds),
    c.distance_km,
    c.square_feet ?? "",
    csvCell(c.source),
    csvCell(c.title || ""),
    csvCell(c.address || ""),
    c.heating ? "Yes" : "No",
    c.parking ? "Yes" : "No",
    csvCell(c.parking_type || ""),
    c.air_conditioning ? "Yes" : "No",
    c.laundry_in_unit ? "Yes" : "No",
    c.furnished ? "Yes" : "No",
    c.electricity_included ? "Yes" : "No",
    c.dishwasher ? "Yes" : "No",
    c.balcony ? "Yes" : "No",
    csvCell(photoUrls(c).join(" | ")),
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
