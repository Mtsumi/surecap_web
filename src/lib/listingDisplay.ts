import type { Building, Listing, UnitAmenityValue } from "./api";
import type { Locale } from "./i18n";

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

function amenityIsPresent(value: UnitAmenityValue | undefined): boolean {
  if (value === true) return true;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "disponible" || normalized.startsWith("oui");
}

export function listingChips(
  amenities: Record<string, UnitAmenityValue> | null | undefined,
  locale: Locale,
): ListingChip[] {
  if (!amenities) return [];
  return BOOLEAN_CHIP_KEYS.filter((key) => amenityIsPresent(amenities[key])).map((key) => ({
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
