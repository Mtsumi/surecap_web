"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchListings, type Listing } from "@/lib/api";
import { detectLocale, t, type Locale } from "@/lib/i18n";
import {
  formatListingRent,
  listingAddress,
  listingApplyHref,
  listingChips,
  listingFacts,
  listingsForBuilding,
  listingShareUrl,
  orderListingsWithFeatured,
  parseListingUnitId,
  uniqueListingBuildings,
} from "@/lib/listingDisplay";
import { listingPhotoFor } from "@/lib/listingPhotos";

export default function ListingsBrowser() {
  const searchParams = useSearchParams();
  const featuredUnitId = parseListingUnitId(searchParams.get("unit"));
  const [locale, setLocale] = useState<Locale>("fr");
  const [listings, setListings] = useState<Listing[]>([]);
  const [buildingId, setBuildingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [shareFallback, setShareFallback] = useState<string | null>(null);

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

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

  const buildings = useMemo(() => uniqueListingBuildings(listings), [listings]);
  const visible = useMemo(() => {
    const filtered = listingsForBuilding(listings, buildingId);
    return orderListingsWithFeatured(filtered, featuredUnitId);
  }, [listings, buildingId, featuredUnitId]);
  const featuredMissing =
    featuredUnitId != null &&
    !loading &&
    !listings.some((listing) => listing.id === featuredUnitId);

  useEffect(() => {
    if (featuredUnitId == null || loading) return;
    document
      .getElementById(`listing-${featuredUnitId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [featuredUnitId, loading, visible]);

  const shareListing = async (unitId: number) => {
    const url = listingShareUrl(unitId, window.location.origin);
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
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-10">
      <header className="mb-8 border-b border-[#e7e0d5] pb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#78716c]">
              Montreal Living
            </p>
            <h1 className="mt-2 text-[1.65rem] font-semibold leading-tight text-[#292524]">
              {t(locale, "listingsTitle")}
            </h1>
            <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-[#57534e]">
              {t(locale, "listingsSubtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLocale(locale === "en" ? "fr" : "en")}
            className="shrink-0 rounded border border-[#d6d0c4] bg-[#fffef9] px-3 py-1.5 text-sm text-[#44403c] transition hover:border-[#a8a29e]"
          >
            {t(locale, "langToggle")}
          </button>
        </div>
        <p className="mt-5 rounded border border-[#ecd9b8] bg-[#fbf3e3] px-4 py-3 text-sm leading-relaxed text-[#7c5a16]">
          {t(locale, "listingsSamplePhotos")}
        </p>
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

      {buildings.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setBuildingId(null)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              buildingId == null
                ? "border-[#3d5a45] bg-[#3d5a45] font-medium text-white"
                : "border-[#e7e0d5] bg-[#fffef9] text-[#44403c] hover:border-[#3d5a45]"
            }`}
          >
            {t(locale, "listingsAllBuildings")}
          </button>
          {buildings.map((building) => (
            <button
              key={building.id}
              type="button"
              onClick={() => setBuildingId(building.id)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                buildingId === building.id
                  ? "border-[#3d5a45] bg-[#3d5a45] font-medium text-white"
                  : "border-[#e7e0d5] bg-[#fffef9] text-[#44403c] hover:border-[#3d5a45]"
              }`}
            >
              {building.name}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <p className="py-12 text-center text-sm text-[#78716c]">{t(locale, "loading")}</p>
      )}

      {!loading && visible.length === 0 && (
        <p className="rounded border border-[#e7e0d5] bg-[#fffef9] px-4 py-6 text-sm leading-relaxed text-[#57534e]">
          {t(locale, "listingsEmpty")}
        </p>
      )}

      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((listing) => {
          const photo = listingPhotoFor(listing.id);
          const rentLabel = formatListingRent(listing.rent, locale);
          const facts = listingFacts(listing, locale);
          const chips = listingChips(listing.amenities, locale).slice(0, 6);
          const featured = listing.id === featuredUnitId;
          return (
            <li key={listing.id}>
              <article
                id={`listing-${listing.id}`}
                className={`overflow-hidden rounded-2xl border bg-[#fffef9] shadow-[0_1px_2px_rgba(41,37,36,0.04)] ${
                  featured ? "border-[#3d5a45] ring-2 ring-[#3d5a45]/25" : "border-[#e7e0d5]"
                }`}
              >
                <div className="relative aspect-[4/3] bg-[#ebe6dc]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.src}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-[#1c1917]/70 px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-white">
                    {t(locale, "listingsSampleBadge")}
                  </span>
                  {rentLabel && (
                    <span className="absolute bottom-3 right-3 rounded-full bg-[#fffef9]/95 px-3 py-1 text-sm font-semibold text-[#1c1917]">
                      {rentLabel}
                    </span>
                  )}
                </div>
                <div className="space-y-3 px-4 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-[#292524]">
                      {listing.building.name}
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
                      className="inline-flex flex-1 items-center justify-center rounded-lg bg-[#3d5a45] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#324a39]"
                    >
                      {t(locale, "listingsApply")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void shareListing(listing.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-[#d6d0c4] bg-white px-3 py-2.5 text-sm font-medium text-[#44403c] transition hover:border-[#a8a29e]"
                    >
                      {copiedId === listing.id
                        ? t(locale, "listingsShared")
                        : t(locale, "listingsShare")}
                    </button>
                  </div>
                  <p className="text-[0.7rem] text-[#a8a29e]">
                    {t(locale, "listingsPhotoCredit")}:{" "}
                    <a
                      href={photo.unsplashUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline-offset-2 hover:underline"
                    >
                      {photo.photographer}
                    </a>
                  </p>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
