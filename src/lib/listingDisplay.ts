import type { Building, Listing, UnitAmenityValue } from "./api";
import type { Locale } from "./i18n";
import { listingPhotosFor } from "./listingPhotos";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

const BOOLEAN_CHIP_KEYS = [
  "fridge_stove",
  "dishwasher",
  "heating_included",
  "hot_water_included",
  "electricity_included",
  "washer_dryer_hookup",
  "building_laundry",
  "air_conditioning",
  "balcony",
  "backyard",
  "renovated",
  "internet",
] as const;

const CHIP_LABELS: Record<Locale, Record<(typeof BOOLEAN_CHIP_KEYS)[number], string>> = {
  fr: {
    fridge_stove: "Frigo et cuisinière",
    dishwasher: "Lave-vaisselle",
    heating_included: "Chauffage inclus",
    hot_water_included: "Eau chaude",
    electricity_included: "Électricité",
    washer_dryer_hookup: "Entrée laveuse-sécheuse",
    building_laundry: "Buanderie",
    air_conditioning: "Climatisation",
    balcony: "Balcon",
    backyard: "Cour",
    renovated: "Rénové",
    internet: "Internet",
  },
  en: {
    fridge_stove: "Fridge and stove",
    dishwasher: "Dishwasher",
    heating_included: "Heating included",
    hot_water_included: "Hot water",
    electricity_included: "Electricity",
    washer_dryer_hookup: "Washer/dryer hookup",
    building_laundry: "Building laundry",
    air_conditioning: "Air conditioning",
    balcony: "Balcony",
    backyard: "Backyard",
    renovated: "Renovated",
    internet: "Internet",
  },
};

export type ListingChip = { key: string; label: string };

export type ListingFact = { key: string; label: string };

export function listingAddress(listing: Pick<Listing, "civic_number"> & { building: Pick<Building, "address"> }): string {
  const address = listing.building.address;
  const civic = listing.civic_number?.trim();
  if (!civic) return address;
  if (address.toLowerCase().startsWith(civic.toLowerCase())) return address;
  return `${civic} · ${address}`;
}

export function listingSharePath(unitId: number): string {
  return `/listings?unit=${unitId}`;
}

export function listingApplyHref(buildingId: number, unitId: number): string {
  return `/apply?building=${buildingId}&unit=${unitId}`;
}

export function listingShareUrl(unitId: number, origin: string): string {
  return `${origin.replace(/\/$/, "")}${listingSharePath(unitId)}`;
}

export function listingPhotoUrl(src: string): string {
  if (/^https?:\/\//i.test(src)) return src;
  return `${API_URL}${src.startsWith("/") ? src : `/${src}`}`;
}

export function listingImageSrcs(listing: Listing): string[] {
  const fromApi = listing.photos?.filter((src) => typeof src === "string" && src.length > 0);
  if (fromApi && fromApi.length > 0) return fromApi.map(listingPhotoUrl);
  return listingPhotosFor(listing.id).map((photo) => photo.src);
}

export function formatListingRent(rent: number | null, locale: Locale): string | null {
  if (rent == null) return null;
  const amount = Math.round(rent).toLocaleString(locale === "fr" ? "fr-CA" : "en-CA");
  return locale === "fr" ? `${amount} $ /mois` : `$${amount}/mo`;
}

export function formatQuebecSize(value: UnitAmenityValue): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const slashHalf = trimmed.match(/^(\d+)\s*1\/2$/);
    if (slashHalf) return `${slashHalf[1]}½`;
    const numeric = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(numeric)) return trimmed;
    return formatQuebecSize(numeric);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const whole = Math.trunc(value);
  const fraction = Math.abs(value - whole);
  if (fraction < 0.05) return String(whole);
  if (Math.abs(fraction - 0.5) < 0.05) return `${whole}½`;
  return String(value);
}

export function listingFacts(
  listing: Pick<Listing, "amenities">,
  locale: Locale,
): ListingFact[] {
  const amenities = listing.amenities ?? {};
  const facts: ListingFact[] = [];
  if (amenities.size != null) {
    const size = formatQuebecSize(amenities.size);
    if (size) facts.push({ key: "size", label: size });
  }
  if (typeof amenities.bedrooms === "number") {
    if (amenities.bedrooms === 0) {
      facts.push({
        key: "bedrooms",
        label: "Studio",
      });
    } else {
      facts.push({
        key: "bedrooms",
        label:
          locale === "fr"
            ? `${amenities.bedrooms} ${amenities.bedrooms === 1 ? "chambre" : "chambres"}`
            : `${amenities.bedrooms} ${amenities.bedrooms === 1 ? "bedroom" : "bedrooms"}`,
      });
    }
  }
  if (typeof amenities.bathrooms === "number") {
    facts.push({
      key: "bathrooms",
      label:
        locale === "fr"
          ? `${amenities.bathrooms} sdb`
          : `${amenities.bathrooms} bath`,
    });
  }
  if (amenities.floor != null && amenities.floor !== "") {
    facts.push({
      key: "floor",
      label: locale === "fr" ? `Étage ${amenities.floor}` : `Floor ${amenities.floor}`,
    });
  }
  return facts;
}

export type BedroomFilter = "any" | "studio" | 1 | 2 | "3+";
export type ListingSort = "default" | "rent_asc" | "rent_desc";

export const LISTING_FILTER_AMENITY_KEYS = BOOLEAN_CHIP_KEYS;

export function listingAmenityLabel(
  locale: Locale,
  key: (typeof BOOLEAN_CHIP_KEYS)[number],
): string {
  return CHIP_LABELS[locale][key];
}

export function listingAmenityIsPresent(value: UnitAmenityValue | undefined): boolean {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "disponible" || normalized.startsWith("oui");
}

function listingBedrooms(listing: Pick<Listing, "amenities">): number | null {
  const raw = listing.amenities?.bedrooms;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) return Number(raw.trim());
  return null;
}

export function filterAndSortListings(
  listings: Listing[],
  filters: {
    bedrooms?: BedroomFilter;
    amenities?: string[];
    sort?: ListingSort;
  },
): Listing[] {
  const bedrooms = filters.bedrooms ?? "any";
  const amenities = filters.amenities ?? [];
  const sort = filters.sort ?? "default";
  const matched = listings.filter((listing) => {
    const actual = listingBedrooms(listing);
    if (bedrooms === "studio" && actual !== 0) return false;
    if (bedrooms === 1 && actual !== 1) return false;
    if (bedrooms === 2 && actual !== 2) return false;
    if (bedrooms === "3+" && (actual == null || actual < 3)) return false;
    for (const key of amenities) {
      if (!listingAmenityIsPresent(listing.amenities?.[key])) return false;
    }
    return true;
  });
  if (sort === "rent_asc") {
    return [...matched].sort((a, b) => {
      if (a.rent == null && b.rent == null) return 0;
      if (a.rent == null) return 1;
      if (b.rent == null) return -1;
      return a.rent - b.rent;
    });
  }
  if (sort === "rent_desc") {
    return [...matched].sort((a, b) => {
      if (a.rent == null && b.rent == null) return 0;
      if (a.rent == null) return 1;
      if (b.rent == null) return -1;
      return b.rent - a.rent;
    });
  }
  return matched;
}

export function listingChips(
  amenities: Record<string, UnitAmenityValue> | null | undefined,
  locale: Locale,
): ListingChip[] {
  if (!amenities) return [];
  return BOOLEAN_CHIP_KEYS.filter((key) => listingAmenityIsPresent(amenities[key])).map((key) => ({
    key,
    label: CHIP_LABELS[locale][key],
  }));
}

export function uniqueListingBuildings(listings: Listing[]): Building[] {
  const seen = new Set<number>();
  const buildings: Building[] = [];
  for (const listing of listings) {
    if (seen.has(listing.building.id)) continue;
    seen.add(listing.building.id);
    buildings.push(listing.building);
  }
  return buildings;
}

export function listingsForBuilding(
  listings: Listing[],
  buildingId: number | null,
): Listing[] {
  if (buildingId == null) return listings;
  return listings.filter((listing) => listing.building.id === buildingId);
}

export function orderListingsWithFeatured(
  listings: Listing[],
  featuredUnitId: number | null,
): Listing[] {
  if (featuredUnitId == null) return listings;
  const featured = listings.find((listing) => listing.id === featuredUnitId);
  if (!featured) return listings;
  return [featured, ...listings.filter((listing) => listing.id !== featuredUnitId)];
}

export function parseListingUnitId(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}
