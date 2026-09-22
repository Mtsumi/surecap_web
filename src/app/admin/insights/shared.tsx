"use client";

import { useState } from "react";
import type { AdminMessageKey } from "@/lib/adminI18n";
import type { BuildingAdmin, UnitAdmin } from "@/lib/adminApi";

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
  on: boolean;
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
  size = "thumb",
  prevLabel,
  nextLabel,
}: {
  images: string[];
  alt: string;
  size?: "thumb" | "card";
  prevLabel: string;
  nextLabel: string;
}) {
  const [i, setI] = useState(0);
  const urls = images.filter(Boolean);
  if (!urls.length) {
    return size === "card" ? (
      <div className="h-28 w-40 rounded bg-[var(--ml-paper)]" />
    ) : (
      <div className="h-12 w-16 rounded bg-[var(--ml-paper)]" />
    );
  }
  const n = urls.length;
  const src = urls[((i % n) + n) % n];
  const box =
    size === "card"
      ? "relative h-28 w-40 shrink-0 overflow-hidden rounded"
      : "relative h-12 w-16 shrink-0 overflow-hidden rounded";
  return (
    <div className={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover" />
      {n > 1 && (
        <>
          <button
            type="button"
            aria-label={prevLabel}
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/45 px-1 text-[10px] leading-none text-white"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setI((cur) => cur - 1);
            }}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label={nextLabel}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/45 px-1 text-[10px] leading-none text-white"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setI((cur) => cur + 1);
            }}
          >
            ›
          </button>
          <span className="absolute bottom-0 right-0 bg-black/50 px-1 text-[9px] text-white">
            {(((i % n) + n) % n) + 1}/{n}
          </span>
        </>
      )}
    </div>
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
    return title ? (
      <span
        title={title}
        className="ml-1 inline-flex items-center rounded bg-[var(--ml-line)] px-1.5 py-0.5 text-[10px] text-[var(--ml-steel)]"
      >
        ·
      </span>
    ) : null;
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
