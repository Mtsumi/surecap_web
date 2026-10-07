"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchListings, type Listing } from "@/lib/api";
import { buildingLabel } from "@/lib/buildingLabel";
import { t } from "@/lib/i18n";
import { useSyncedLocale } from "@/lib/useSyncedLocale";
import LocaleToggle from "@/components/LocaleToggle";
import {
  listingAreaBySlug,
  listingAreaForBuildingName,
  listingAreaPath,
  listingBrowserPanels,
  listingMapPins,
  listingsForArea,
  parseListingView,
} from "@/lib/listingAreas";
import {
  formatListingRent,
  listingAddress,
  listingApplyHref,
  listingChips,
  listingFacts,
  listingImageSrcs,
  listingAmenityIsPresent,
  listingAmenityLabel,
  listingsForBuilding,
  listingShareUrl,
  orderListingsWithFeatured,
  parseListingUnitId,
  uniqueListingBuildings,
  filterAndSortListings,
  LISTING_FILTER_AMENITY_KEYS,
  type BedroomFilter,
  type ListingSort,
} from "@/lib/listingDisplay";
import ListingAreaGrid from "./ListingAreaGrid";
import ListingPhotoCarousel from "./ListingPhotoCarousel";
import ListingsMap from "./ListingsMap";

type Props = {
  areaSlug?: string;
};

function chipClass(active: boolean): string {
  return `shrink-0 rounded-full border px-3 py-2 text-sm transition ${
    active
      ? "border-[#3d5a45] bg-[#3d5a45] font-medium text-white"
      : "border-[#e7e0d5] bg-[#fffef9] text-[#44403c] hover:border-[#3d5a45]"
  }`;
}

export default function ListingsBrowser({ areaSlug }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const area = listingAreaBySlug(areaSlug);
  const unknownArea = Boolean(areaSlug) && area == null;
  const view = parseListingView(searchParams.get("view"));
  const featuredUnitId = parseListingUnitId(searchParams.get("unit"));
  const requestedBuildingId = parseListingUnitId(searchParams.get("building"));
  const { locale, setLocale } = useSyncedLocale();
  const [listings, setListings] = useState<Listing[]>([]);
  const [bedrooms, setBedrooms] = useState<BedroomFilter>("any");
  const [amenityFilters, setAmenityFilters] = useState<string[]>([]);
  const [sort, setSort] = useState<ListingSort>("default");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [shareFallback, setShareFallback] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchListings()
      .then((data) => {
        if (!cancelled) setListings(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t(locale, "error"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Locale is only used for the fallback error string; do not refetch on toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scopedListings = useMemo(
    () => (area ? listingsForArea(listings, area) : listings),
    [area, listings]
  );
  const buildings = useMemo(() => uniqueListingBuildings(scopedListings), [scopedListings]);
  const buildingId = buildings.some((building) => building.id === requestedBuildingId)
    ? requestedBuildingId
    : null;
  const pins = useMemo(() => listingMapPins(listings, area), [listings, area]);
  const featuredMapsToArea =
    featuredUnitId != null &&
    listings.some(
      (listing) =>
        listing.id === featuredUnitId && listingAreaForBuildingName(listing.building.name)
    );
  const { mapVisible, showUnitGrid, showAreaIndex, redirectShare } = listingBrowserPanels({
    hasArea: area != null,
    unknownArea,
    view,
    hasFeaturedUnit: featuredUnitId != null,
    awaitingShareRedirect: loading || featuredMapsToArea,
  });
  const amenityOptions = useMemo(() => {
    return LISTING_FILTER_AMENITY_KEYS.filter((key) =>
      scopedListings.some((listing) => listingAmenityIsPresent(listing.amenities?.[key]))
    );
  }, [scopedListings]);
  const extraFilterCount = (bedrooms !== "any" ? 1 : 0) + amenityFilters.length;
  const filtersActive = extraFilterCount > 0;
  const visible = useMemo(() => {
    const filtered = listingsForBuilding(scopedListings, buildingId);
    const queried = filterAndSortListings(filtered, {
      bedrooms,
      amenities: amenityFilters,
      sort,
    });
    return orderListingsWithFeatured(queried, featuredUnitId);
  }, [scopedListings, buildingId, featuredUnitId, bedrooms, amenityFilters, sort]);
  const featuredMissing =
    !unknownArea &&
    featuredUnitId != null &&
    !loading &&
    !redirectShare &&
    !scopedListings.some((listing) => listing.id === featuredUnitId);

  useEffect(() => {
    if (unknownArea || area || view === "map" || featuredUnitId == null || loading) return;
    const match = listings.find((listing) => listing.id === featuredUnitId);
    if (!match) return;
    const matchArea = listingAreaForBuildingName(match.building.name);
    if (!matchArea) return;
    router.replace(listingAreaPath(matchArea.slug, { unit: featuredUnitId }));
  }, [unknownArea, area, view, featuredUnitId, loading, listings, router]);

  const replaceQuery = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value == null) params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const selectView = (next: "grid" | "map") => {
    if (!area && next === "grid") {
      replaceQuery({ view: "grid", unit: null, building: null });
      return;
    }
    replaceQuery({ view: next });
  };

  useEffect(() => {
    if (featuredUnitId == null || loading) return;
    document
      .getElementById(`listing-${featuredUnitId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [featuredUnitId, loading, visible]);

  const shareListing = async (unitId: number) => {
    const url = listingShareUrl(unitId, window.location.origin, area?.slug);
    setShareFallback(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(unitId);
      window.setTimeout(() => setCopiedId((current) => (current === unitId ? null : current)), 2000);
    } catch {
      setCopiedId(null);
      setShareFallback(url);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-8 pt-0 sm:px-5 sm:pb-10">
      <header className="sticky top-0 z-20 -mx-4 mb-6 border-b border-[#e7e0d5] bg-[#f4f1ec]/95 px-4 py-4 backdrop-blur-sm sm:-mx-5 sm:mb-8 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#78716c]">
              Montreal Living
            </p>
            {area ? (
              <Link
                href="/listings"
                className="mt-2 inline-block text-sm text-[#3d5a45] underline-offset-2 hover:underline"
              >
                {t(locale, "listingsAllAreas")}
              </Link>
            ) : null}
            <h1 className="mt-2 text-2xl font-semibold leading-tight text-[#292524] sm:text-[1.65rem]">
              {area ? area.labels[locale] : t(locale, "listingsTitle")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#57534e] sm:text-[0.95rem]">
              {area ? area.buildings.join(", ") : t(locale, "listingsSubtitle")}
            </p>
          </div>
          <LocaleToggle locale={locale} onChange={setLocale} />
        </div>
      </header>

      {error && (
        <div className="mb-5 rounded border border-[#e7c4c4] bg-[#fdf5f5] px-4 py-3 text-sm text-[#7f1d1d]">
          {error}
        </div>
      )}

      {featuredMissing && (
        <p className="mb-5 text-sm text-[#78716c]">{t(locale, "listingsFeaturedMissing")}</p>
      )}

      {shareFallback && (
        <p className="mb-5 break-all rounded border border-[#e7e0d5] bg-[#fffef9] px-4 py-3 text-sm text-[#44403c]">
          {t(locale, "listingsShareFailed")}: {shareFallback}
        </p>
      )}

      {unknownArea ? (
        <p className="rounded border border-[#e7e0d5] bg-[#fffef9] px-4 py-6 text-sm leading-relaxed text-[#57534e]">
          {t(locale, "listingsAreaNotFound")}
        </p>
      ) : (
        <div
          className="mb-6 inline-flex rounded-full border border-[#e7e0d5] bg-[#fffef9] p-1"
          role="group"
          aria-label={`${area ? t(locale, "listingsViewListings") : t(locale, "listingsViewAreas")} / ${t(locale, "listingsViewMap")}`}
        >
          <button
            type="button"
            aria-pressed={!mapVisible}
            onClick={() => selectView("grid")}
            className={`rounded-full px-4 py-2 text-sm ${
              !mapVisible ? "bg-[#3d5a45] font-medium text-white" : "text-[#44403c]"
            }`}
          >
            {area ? t(locale, "listingsViewListings") : t(locale, "listingsViewAreas")}
          </button>
          <button
            type="button"
            aria-pressed={mapVisible}
            onClick={() => selectView("map")}
            className={`rounded-full px-4 py-2 text-sm ${
              mapVisible ? "bg-[#3d5a45] font-medium text-white" : "text-[#44403c]"
            }`}
          >
            {t(locale, "listingsViewMap")}
          </button>
        </div>
      )}

      {redirectShare ? (
        <p className="py-12 text-center text-sm text-[#78716c]">{t(locale, "loading")}</p>
      ) : null}

      {showAreaIndex ? (
        <div className={mapVisible ? "hidden" : ""}>
          <ListingAreaGrid locale={locale} listings={listings} showCounts={!loading && !error} />
        </div>
      ) : null}

      {showUnitGrid ? (
      <div className={mapVisible ? "hidden" : ""}>
      {buildings.length > 1 && (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          <button
            type="button"
            onClick={() => replaceQuery({ building: null })}
            className={chipClass(buildingId == null)}
          >
            {t(locale, "listingsAllBuildings")}
          </button>
          {buildings.map((building) => (
            <button
              key={building.id}
              type="button"
              onClick={() => replaceQuery({ building: String(building.id) })}
              className={chipClass(buildingId === building.id)}
            >
              {buildingLabel(building.name, building.address)}
            </button>
          ))}
        </div>
      )}

      {!loading && scopedListings.length > 0 && (
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="listing-filters"
              onClick={() => setFiltersOpen((open) => !open)}
              className={chipClass(filtersOpen || extraFilterCount > 0)}
            >
              {t(locale, "listingsFilters")}
              {extraFilterCount > 0 ? ` (${extraFilterCount})` : ""}
            </button>
            <label className="inline-flex items-center gap-2 text-sm text-[#44403c]">
              <span className="sr-only">{t(locale, "listingsSort")}</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as ListingSort)}
                className="rounded-full border border-[#e7e0d5] bg-[#fffef9] px-3 py-2 text-sm text-[#44403c]"
              >
                <option value="default">{t(locale, "listingsSortDefault")}</option>
                <option value="rent_asc">{t(locale, "listingsSortRentAsc")}</option>
                <option value="rent_desc">{t(locale, "listingsSortRentDesc")}</option>
              </select>
            </label>
            {filtersActive ? (
              <button
                type="button"
                onClick={() => {
                  setBedrooms("any");
                  setAmenityFilters([]);
                }}
                className="text-sm text-[#3d5a45] underline-offset-2 hover:underline"
              >
                {t(locale, "listingsClearFilters")}
              </button>
            ) : null}
          </div>

          {filtersOpen ? (
            <div
              id="listing-filters"
              className="mt-3 rounded-xl border border-[#e7e0d5] bg-[#fffef9] px-3 py-3 sm:px-4"
            >
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#78716c]">
                  {t(locale, "listingsBedrooms")}
                </p>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
                  {(
                    [
                      ["any", t(locale, "listingsBedroomsAny")],
                      ["studio", t(locale, "listingsStudio")],
                      [1, "1"],
                      [2, "2"],
                      ["3+", t(locale, "listingsBedrooms3Plus")],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={String(value)}
                      type="button"
                      onClick={() => setBedrooms(value)}
                      className={chipClass(bedrooms === value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {amenityOptions.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#78716c]">
                    {t(locale, "listingsAmenities")}
                  </p>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
                    {amenityOptions.map((key) => {
                      const active = amenityFilters.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            setAmenityFilters((current) =>
                              current.includes(key)
                                ? current.filter((item) => item !== key)
                                : [...current, key]
                            )
                          }
                          className={chipClass(active)}
                        >
                          {listingAmenityLabel(locale, key)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {loading && (
        <p className="py-12 text-center text-sm text-[#78716c]">{t(locale, "loading")}</p>
      )}

      {!loading && visible.length === 0 && (
        <p className="rounded border border-[#e7e0d5] bg-[#fffef9] px-4 py-6 text-sm leading-relaxed text-[#57534e]">
          {t(locale, filtersActive ? "listingsEmptyFiltered" : "listingsEmpty")}
        </p>
      )}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {visible.map((listing) => {
          const photos = listingImageSrcs(listing);
          const rentLabel = formatListingRent(listing.rent, locale);
          const facts = listingFacts(listing, locale);
          const chips = listingChips(listing.amenities, locale).slice(0, 6);
          const featured = listing.id === featuredUnitId;
          const copied = copiedId === listing.id;
          return (
            <li key={listing.id}>
              <article
                id={`listing-${listing.id}`}
                className={`overflow-hidden rounded-2xl border bg-[#fffef9] shadow-[0_1px_2px_rgba(41,37,36,0.04)] ${
                  featured ? "border-[#3d5a45] ring-2 ring-[#3d5a45]/25" : "border-[#e7e0d5]"
                }`}
              >
                <ListingPhotoCarousel
                  photos={photos}
                  rentLabel={rentLabel}
                  prevLabel={t(locale, "listingsPrevPhoto")}
                  nextLabel={t(locale, "listingsNextPhoto")}
                />
                <div className="space-y-3 px-4 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-[#292524]">
                      {buildingLabel(
                        listing.building.name,
                        listing.building.address
                      )}
                      <span className="font-medium text-[#78716c]"> · {listing.unit_number}</span>
                    </h2>
                    <p className="mt-1 text-sm leading-snug text-[#78716c]">
                      {listingAddress(listing)}
                    </p>
                  </div>
                  {(facts.length > 0 || listing.available_date) && (
                    <p className="text-sm text-[#44403c]">
                      {[
                        ...facts.map((fact) => fact.label),
                        listing.available_date
                          ? `${t(locale, "available")}: ${listing.available_date}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  {chips.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {chips.map((chip) => (
                        <li
                          key={chip.key}
                          className="rounded-full bg-[#f4f1ec] px-2.5 py-1 text-xs text-[#44403c]"
                        >
                          {chip.label}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Link
                      href={listingApplyHref(listing.building.id, listing.id)}
                      className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-[#3d5a45] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#324a39]"
                    >
                      {t(locale, "listingsApply")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void shareListing(listing.id)}
                      aria-label={copied ? t(locale, "listingsShared") : t(locale, "listingsShare")}
                      title={copied ? t(locale, "listingsShared") : t(locale, "listingsShare")}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#d6d0c4] bg-white text-[#44403c] transition hover:border-[#a8a29e]"
                    >
                      {copied ? <CheckIcon /> : <ShareIcon />}
                    </button>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
      </div>
      ) : null}

      {mapVisible && loading ? (
        <p className="py-12 text-center text-sm text-[#78716c]">{t(locale, "loading")}</p>
      ) : null}
      {mapVisible && !loading && pins.length === 0 ? (
        <p className="rounded border border-[#e7e0d5] bg-[#fffef9] px-4 py-6 text-sm leading-relaxed text-[#57534e]">
          {t(locale, "listingsMapEmpty")}
        </p>
      ) : null}
      {mapVisible && !loading && pins.length > 0 ? (
        <ListingsMap
          pins={pins}
          unavailableLabel={t(locale, "listingsMapUnavailable")}
          onSelect={(pin) => {
            if (area) {
              replaceQuery({ view: "grid", building: String(pin.id) });
              return;
            }
            router.push(listingAreaPath(pin.areaSlug, { building: pin.id }));
          }}
        />
      ) : null}
    </main>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="18" cy="5" r="2.4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="2.4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.2 10.8 15.7 6.6M8.2 13.2l7.5 4.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="m5 12 5 5 9-10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
