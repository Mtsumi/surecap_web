"use client";

import { useEffect, useRef, useState } from "react";
import type { AdminMessageKey } from "@/lib/adminI18n";
import type { BuildingAdmin, UnitAdmin } from "@/lib/adminApi";
import { getAdminToken } from "@/lib/adminAuth";
import { adminUi } from "@/lib/adminUi";
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

/** Daily Celery scrape radius (km). Filters can only narrow within this set. */
export const DEFAULT_SCRAPE_RADIUS_KM = 2;

const COMP_FILTERS_STORAGE_KEY = "insightsCompFilters";

export type CompFilters = {
  /** null = all comps from the scrape (already ~2 km). */
  maxKm: number | null;
  minSqft: string;
  maxSqft: string;
  requireSqft: boolean;
  /**
   * Amenity constraints. Missing key = Any.
   * "with" = must have; "without" = must not have (missing/false counts as without).
   */
  amenities: Partial<Record<AmenityFilterKey, "with" | "without">>;
};

export type AmenityFilterKey =
  | "heating"
  | "electricity_included"
  | "air_conditioning"
  | "balcony"
  | "laundry_in_unit"
  | "water_included"
  | "fridge_freezer"
  | "stove_included"
  | "parking"
  | "furnished"
  | "dishwasher";

/** Inventory amenity → Comp field. Fridge/stove both map from fridge_stove. */
const UNIT_AMENITY_TO_COMP: {
  unitKey: string;
  compKey: AmenityFilterKey;
}[] = [
  { unitKey: "heating_included", compKey: "heating" },
  { unitKey: "electricity_included", compKey: "electricity_included" },
  { unitKey: "air_conditioning", compKey: "air_conditioning" },
  { unitKey: "balcony", compKey: "balcony" },
  { unitKey: "washer_dryer_hookup", compKey: "laundry_in_unit" },
  { unitKey: "hot_water_included", compKey: "water_included" },
  { unitKey: "fridge_stove", compKey: "fridge_freezer" },
  { unitKey: "fridge_stove", compKey: "stove_included" },
];

/** Filters shown in the amenity panel (order). */
export const AMENITY_FILTER_KEYS: AmenityFilterKey[] = [
  "heating",
  "electricity_included",
  "air_conditioning",
  "balcony",
  "laundry_in_unit",
  "water_included",
  "fridge_freezer",
  "stove_included",
  "parking",
  "furnished",
  "dishwasher",
];

const AMENITY_FILTER_LABEL: Record<AmenityFilterKey, AdminMessageKey> = {
  heating: "insightsHeating",
  electricity_included: "insightsElectricity",
  air_conditioning: "insightsAC",
  balcony: "insightsBalcony",
  laundry_in_unit: "insightsLaundry",
  water_included: "insightsWater",
  fridge_freezer: "insightsFridge",
  stove_included: "insightsStove",
  parking: "insightsParking",
  furnished: "insightsFurnished",
  dishwasher: "insightsDishwasher",
};

export const DEFAULT_COMP_FILTERS: CompFilters = {
  maxKm: null,
  minSqft: "",
  maxSqft: "",
  requireSqft: false,
  amenities: {},
};

/** UI only exposes "with"; drop legacy "without" from sessionStorage. */
function withOnlyAmenities(
  amenities: CompFilters["amenities"] | undefined
): CompFilters["amenities"] {
  const next: CompFilters["amenities"] = {};
  if (!amenities) return next;
  for (const [key, mode] of Object.entries(amenities)) {
    if (mode === "with") next[key as AmenityFilterKey] = "with";
  }
  return next;
}

function amenityModesActive(
  amenities: CompFilters["amenities"] | undefined
): boolean {
  if (!amenities) return false;
  return Object.values(amenities).some((m) => m === "with" || m === "without");
}

export function filtersAreActive(f: CompFilters): boolean {
  return (
    f.maxKm != null ||
    f.requireSqft ||
    f.minSqft.trim() !== "" ||
    f.maxSqft.trim() !== "" ||
    amenityModesActive(f.amenities)
  );
}

function unitAmenityTruthy(raw: unknown): boolean | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") {
    if (raw === 1) return true;
    if (raw === 0) return false;
    return null;
  }
  const s = String(raw).trim().toLowerCase();
  if (s === "?" || s === "") return null;
  if (
    s === "oui" ||
    s === "yes" ||
    s === "true" ||
    s === "1" ||
    s === "inclus" ||
    s.startsWith("oui")
  ) {
    return true;
  }
  if (s === "non" || s === "no" || s === "false" || s === "0") return false;
  return null;
}

/** Defaults for unit page: has amenity → Must have; clearly no → Must not have. */
export function amenitiesFromUnit(
  unit: UnitAdmin
): Partial<Record<AmenityFilterKey, "with" | "without">> {
  const a = unit.amenities ?? {};
  const out: Partial<Record<AmenityFilterKey, "with" | "without">> = {};
  for (const { unitKey, compKey } of UNIT_AMENITY_TO_COMP) {
    const truth = unitAmenityTruthy(a[unitKey]);
    if (truth === true) out[compKey] = "with";
    else if (truth === false) out[compKey] = "without";
  }
  return out;
}

function compAmenityOn(c: Comp, key: AmenityFilterKey): boolean {
  const v = c[key];
  return v === true;
}

export function filterComps(comps: Comp[], f: CompFilters): Comp[] {
  const minS = f.minSqft.trim() === "" ? null : Number(f.minSqft);
  const maxS = f.maxSqft.trim() === "" ? null : Number(f.maxSqft);
  const amenityEntries = Object.entries(f.amenities ?? {}).filter(
    ([, mode]) => mode === "with" || mode === "without"
  ) as [AmenityFilterKey, "with" | "without"][];

  return comps.filter((c) => {
    if (f.maxKm != null) {
      const d = Number(c.distance_km);
      if (Number.isNaN(d) || d > f.maxKm) return false;
    }
    const sq = c.square_feet;
    if (f.requireSqft && (sq == null || sq <= 0)) return false;
    if (minS != null && !Number.isNaN(minS) && (sq == null || sq < minS)) {
      return false;
    }
    if (maxS != null && !Number.isNaN(maxS) && (sq == null || sq > maxS)) {
      return false;
    }
    for (const [key, mode] of amenityEntries) {
      const on = compAmenityOn(c, key);
      if (mode === "with" && !on) return false;
      if (mode === "without" && on) return false;
    }
    return true;
  });
}

function medianPrice(prices: number[]): number {
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Rebuild bedroom rollups from a filtered comps list (trends/amenity splits omitted). */
export function bedroomSummariesFromComps(
  comps: Comp[],
  baseline?: Record<string, BedroomSummary>
): Record<string, BedroomSummary> {
  const groups = new Map<string, number[]>();
  for (const c of comps) {
    const key = c.beds || "?";
    if (key === "?") continue;
    if (typeof c.price !== "number" || Number.isNaN(c.price)) continue;
    const list = groups.get(key) ?? [];
    list.push(c.price);
    groups.set(key, list);
  }
  const out: Record<string, BedroomSummary> = {};
  for (const [key, prices] of Array.from(groups.entries())) {
    if (!prices.length) continue;
    const med = medianPrice(prices);
    const base = baseline?.[key];
    const spreadLow = base
      ? Math.max(0, base.median - base.suggested_min)
      : Math.round(med * 0.05);
    const spreadHigh = base
      ? Math.max(0, base.suggested_max - base.median)
      : Math.round(med * 0.05);
    out[key] = {
      count: prices.length,
      median: Math.round(med),
      min: Math.min(...prices),
      max: Math.max(...prices),
      suggested_min: Math.round(med - spreadLow),
      suggested_max: Math.round(med + spreadHigh),
      trend_pct: null,
    };
  }
  return out;
}

export function insightWithFilters(
  data: BuildingInsight,
  filters: CompFilters
): {
  comps: Comp[];
  by_bedrooms: Record<string, BedroomSummary>;
  narrowed: boolean;
} {
  const source = data.top_comps ?? [];
  if (!filtersAreActive(filters) || source.length === 0) {
    return {
      comps: source,
      by_bedrooms: data.by_bedrooms,
      narrowed: false,
    };
  }
  const comps = filterComps(source, filters);
  // Only leave server rollups when every loaded comp already passes the filters.
  if (comps.length === source.length) {
    return {
      comps: source,
      by_bedrooms: data.by_bedrooms,
      narrowed: false,
    };
  }
  return {
    comps,
    by_bedrooms: bedroomSummariesFromComps(comps, data.by_bedrooms),
    narrowed: true,
  };
}

export function useCompFilters(): [
  CompFilters,
  (next: CompFilters) => void,
] {
  const [filters, setFilters] = useState<CompFilters>(() => {
    if (typeof window === "undefined") return DEFAULT_COMP_FILTERS;
    try {
      const raw = sessionStorage.getItem(COMP_FILTERS_STORAGE_KEY);
      if (!raw) return DEFAULT_COMP_FILTERS;
      const parsed = JSON.parse(raw) as Partial<CompFilters>;
      return {
        ...DEFAULT_COMP_FILTERS,
        ...parsed,
        amenities: withOnlyAmenities(parsed.amenities),
      };
    } catch {
      return DEFAULT_COMP_FILTERS;
    }
  });

  const update = (next: CompFilters) => {
    const normalized: CompFilters = {
      ...DEFAULT_COMP_FILTERS,
      ...next,
      amenities: withOnlyAmenities(next.amenities),
    };
    setFilters(normalized);
    try {
      sessionStorage.setItem(COMP_FILTERS_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      /* ignore */
    }
  };

  return [filters, update];
}

const DISTANCE_OPTIONS_KM: (number | null)[] = [null, 0.5, 1, 1.5, 2];

export function ScrapeRadiusNote({
  t,
}: {
  t: (k: AdminMessageKey) => string;
}) {
  return (
    <p className="text-xs text-[var(--ml-steel)]">
      {t("insightsScrapeRadiusNote").replace(
        "{km}",
        String(DEFAULT_SCRAPE_RADIUS_KM)
      )}
    </p>
  );
}

type ActiveChip = {
  id: string;
  label: string;
  clear: (current: CompFilters) => CompFilters;
};

function activeFilterChips(
  filters: CompFilters,
  t: (k: AdminMessageKey) => string
): ActiveChip[] {
  const chips: ActiveChip[] = [];
  if (filters.maxKm != null) {
    chips.push({
      id: "maxKm",
      label: t("insightsFilterDistanceKm").replace(
        "{km}",
        String(filters.maxKm)
      ),
      clear: (f) => ({ ...f, maxKm: null }),
    });
  }
  if (filters.minSqft.trim()) {
    chips.push({
      id: "minSqft",
      label: `≥ ${filters.minSqft} ${t("insightsSqft")}`,
      clear: (f) => ({ ...f, minSqft: "" }),
    });
  }
  if (filters.maxSqft.trim()) {
    chips.push({
      id: "maxSqft",
      label: `≤ ${filters.maxSqft} ${t("insightsSqft")}`,
      clear: (f) => ({ ...f, maxSqft: "" }),
    });
  }
  if (filters.requireSqft) {
    chips.push({
      id: "requireSqft",
      label: t("insightsFilterRequireSqft"),
      clear: (f) => ({ ...f, requireSqft: false }),
    });
  }
  for (const key of AMENITY_FILTER_KEYS) {
    if (filters.amenities?.[key] !== "with") continue;
    chips.push({
      id: `amenity-${key}`,
      label: t(AMENITY_FILTER_LABEL[key]),
      clear: (f) => {
        const amenities = { ...(f.amenities ?? {}) };
        delete amenities[key];
        return { ...f, amenities };
      },
    });
  }
  return chips;
}

export function CompFiltersBar({
  filters,
  onChange,
  t,
  resultCount,
  totalCount,
  sticky = false,
  showUnitMatchHint = false,
}: {
  filters: CompFilters;
  onChange: (next: CompFilters) => void;
  t: (k: AdminMessageKey) => string;
  resultCount?: number;
  totalCount?: number;
  /** Keep the strip visible while scrolling comps (building / unit pages). */
  sticky?: boolean;
  /** Short note when amenities were pre-filled from inventory. */
  showUnitMatchHint?: boolean;
}) {
  const active = filtersAreActive(filters);
  const amenityOn = amenityModesActive(filters.amenities);
  const [amenitiesOpen, setAmenitiesOpen] = useState(amenityOn);
  const chips = activeFilterChips(filters, t);

  useEffect(() => {
    if (amenityOn) setAmenitiesOpen(true);
  }, [amenityOn]);

  const setAmenityChecked = (key: AmenityFilterKey, checked: boolean) => {
    const amenities = { ...(filters.amenities ?? {}) };
    if (checked) amenities[key] = "with";
    else delete amenities[key];
    onChange({ ...filters, amenities });
  };

  const shell = sticky
    ? "sticky top-0 z-20 border-b border-[var(--ml-line)] bg-[var(--ml-card)]/95 shadow-sm backdrop-blur-sm"
    : adminUi.card;

  return (
    <div className={`${shell} px-4 py-3`}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[7.5rem] flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ml-steel)]">
          {t("insightsFilterMaxDistance")}
          <select
            className={adminUi.input + " text-sm"}
            value={filters.maxKm == null ? "" : String(filters.maxKm)}
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                ...filters,
                maxKm: v === "" ? null : Number(v),
              });
            }}
          >
            {DISTANCE_OPTIONS_KM.map((km) => (
              <option key={km == null ? "all" : km} value={km == null ? "" : km}>
                {km == null
                  ? t("insightsFilterDistanceAll").replace(
                      "{km}",
                      String(DEFAULT_SCRAPE_RADIUS_KM)
                    )
                  : t("insightsFilterDistanceKm").replace("{km}", String(km))}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-24 flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ml-steel)]">
          {t("insightsFilterMinSqft")}
          <input
            type="number"
            min={0}
            step={50}
            inputMode="numeric"
            placeholder={t("insightsFilterAny")}
            className={adminUi.input + " text-sm"}
            value={filters.minSqft}
            onChange={(e) => onChange({ ...filters, minSqft: e.target.value })}
          />
        </label>
        <label className="flex w-24 flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ml-steel)]">
          {t("insightsFilterMaxSqft")}
          <input
            type="number"
            min={0}
            step={50}
            inputMode="numeric"
            placeholder={t("insightsFilterAny")}
            className={adminUi.input + " text-sm"}
            value={filters.maxSqft}
            onChange={(e) => onChange({ ...filters, maxSqft: e.target.value })}
          />
        </label>
        <label className="mb-1 flex cursor-pointer items-center gap-2 text-sm text-[var(--ml-ink)]">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--ml-pine)]"
            checked={filters.requireSqft}
            onChange={(e) =>
              onChange({ ...filters, requireSqft: e.target.checked })
            }
          />
          {t("insightsFilterRequireSqft")}
        </label>
        {active ? (
          <button
            type="button"
            className={`${adminUi.btnGhost} mb-0.5 text-sm`}
            onClick={() => onChange(DEFAULT_COMP_FILTERS)}
          >
            {t("insightsFilterReset")}
          </button>
        ) : null}
      </div>

      <div className="mt-3 border-t border-[var(--ml-line)] pt-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ml-ink)] hover:text-[var(--ml-pine)]"
            aria-expanded={amenitiesOpen}
            onClick={() => setAmenitiesOpen((o) => !o)}
          >
            <span
              className={`inline-block text-[10px] text-[var(--ml-steel)] transition-transform ${
                amenitiesOpen ? "rotate-90" : ""
              }`}
              aria-hidden
            >
              ▸
            </span>
            {t("insightsAmenityFilters")}
            {amenityOn ? (
              <span className="rounded-full bg-[var(--ml-pine)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--ml-pine)]">
                {
                  AMENITY_FILTER_KEYS.filter(
                    (k) => filters.amenities?.[k] === "with"
                  ).length
                }
              </span>
            ) : null}
          </button>
          {amenityOn ? (
            <button
              type="button"
              className="text-xs text-[var(--ml-steel)] underline hover:text-[var(--ml-ink)]"
              onClick={() => onChange({ ...filters, amenities: {} })}
            >
              {t("insightsAmenityFiltersClear")}
            </button>
          ) : null}
          {showUnitMatchHint && amenityOn ? (
            <span className="text-[11px] text-[var(--ml-steel)]">
              {t("insightsAmenityFiltersUnitHint")}
            </span>
          ) : null}
        </div>
        {amenitiesOpen ? (
          <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {AMENITY_FILTER_KEYS.map((key) => {
              const checked = filters.amenities?.[key] === "with";
              return (
                <label
                  key={key}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors ${
                    checked
                      ? "bg-[var(--ml-pine)]/10 text-[var(--ml-ink)]"
                      : "text-[var(--ml-ink)] hover:bg-[var(--ml-paper)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-[var(--ml-pine)]"
                    checked={checked}
                    onChange={(e) => setAmenityChecked(key, e.target.checked)}
                  />
                  <span className="min-w-0 truncate">
                    {t(AMENITY_FILTER_LABEL[key])}
                  </span>
                </label>
              );
            })}
          </div>
        ) : null}
      </div>

      {chips.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-[var(--ml-line)] bg-[var(--ml-paper)] px-2 py-0.5 text-[11px] text-[var(--ml-ink)] hover:border-[var(--ml-pine)] hover:text-[var(--ml-pine)]"
              onClick={() => onChange(chip.clear(filters))}
              title={t("insightsFilterChipRemove")}
            >
              {chip.label}
              <span aria-hidden className="text-[var(--ml-steel)]">
                ×
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {typeof resultCount === "number" && typeof totalCount === "number" ? (
        <p className="mt-2 text-[11px] text-[var(--ml-steel)]">
          {t("insightsFilterShowing")
            .replace("{shown}", String(resultCount))
            .replace("{total}", String(totalCount))}
        </p>
      ) : null}
    </div>
  );
}

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
