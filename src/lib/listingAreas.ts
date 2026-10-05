import type { Listing } from "./api";

export type ListingAreaSlug =
  | "cote-des-neiges"
  | "plateau"
  | "lachine"
  | "west-island"
  | "villeray"
  | "rosemont";

export type ListingArea = {
  slug: ListingAreaSlug;
  labels: { en: string; fr: string };
  buildings: readonly string[];
  image: string;
  imageAlt: { en: string; fr: string };
  credit: {
    author: string;
    license: { en: string; fr: string };
    href: string;
  };
};

/** Public neighborhoods for the listings site. Not Steve's Dropbox folder tree. */
export const LISTING_AREAS: readonly ListingArea[] = [
  {
    slug: "cote-des-neiges",
    labels: { en: "Côte-des-Neiges", fr: "Côte-des-Neiges" },
    buildings: ["Dupuis", "Goyer", "Linton"],
    image: "/listings/areas/cote-des-neiges.jpg",
    imageAlt: { en: "Saint Joseph's Oratory", fr: "Oratoire Saint-Joseph" },
    credit: {
      author: "Paolo Costa Baldi",
      license: { en: "CC BY-SA 3.0", fr: "CC BY-SA 3.0" },
      href: "https://commons.wikimedia.org/wiki/File:Oratoire_Saint-Joseph_du_Mont-Royal_-_Montreal.jpg",
    },
  },
  {
    slug: "plateau",
    labels: { en: "Plateau Mont-Royal", fr: "Plateau Mont-Royal" },
    buildings: ["DeBullion", "St-Dominique"],
    image: "/listings/areas/plateau.jpg",
    imageAlt: { en: "Plateau street with Mount Royal", fr: "Rue du Plateau et le mont Royal" },
    credit: {
      author: "Chicoutimi",
      license: { en: "Public domain", fr: "Domaine public" },
      href: "https://commons.wikimedia.org/wiki/File:Plateau_Mont-Royal.jpg",
    },
  },
  {
    slug: "lachine",
    labels: { en: "Lachine", fr: "Lachine" },
    buildings: ["St-Joseph", "10e avenue"],
    image: "/listings/areas/lachine.jpg",
    imageAlt: { en: "Lachine Canal", fr: "Canal de Lachine" },
    credit: {
      author: "Sylvain Pastor",
      license: { en: "CC BY-SA 3.0", fr: "CC BY-SA 3.0" },
      href: "https://commons.wikimedia.org/wiki/File:Canal_Lachine.jpg",
    },
  },
  {
    slug: "west-island",
    labels: { en: "West Island", fr: "Ouest-de-l'Île" },
    buildings: ["Duff", "Oxford", "Blue Haven", "Nobel"],
    image: "/listings/areas/west-island.jpg",
    imageAlt: { en: "Cap-Saint-Jacques beach", fr: "Plage du Cap-Saint-Jacques" },
    credit: {
      author: "Ville de Montréal",
      license: { en: "CC BY 2.0", fr: "CC BY 2.0" },
      href: "https://commons.wikimedia.org/wiki/File:Plage_du_parc_r%C3%A9gional_du_Cap-Saint-Jacques_(Pierrefonds)_(9664319165).jpg",
    },
  },
  {
    slug: "villeray",
    labels: { en: "Villeray", fr: "Villeray" },
    buildings: ["Mistral"],
    image: "/listings/areas/villeray.jpg",
    imageAlt: { en: "Jarry Park", fr: "Parc Jarry" },
    credit: {
      author: "Miguel Tremblay",
      license: { en: "Public domain", fr: "Domaine public" },
      href: "https://commons.wikimedia.org/wiki/File:Parc_Jarry.jpg",
    },
  },
  {
    slug: "rosemont",
    labels: { en: "Rosemont", fr: "Rosemont" },
    buildings: ["Masson"],
    image: "/listings/areas/rosemont.jpg",
    imageAlt: { en: "Olympic Stadium", fr: "Stade olympique" },
    credit: {
      author: "Reading Tom",
      license: { en: "CC BY 2.0", fr: "CC BY 2.0" },
      href: "https://commons.wikimedia.org/wiki/File:The_Olympic_Stadium_(2934977302).jpg",
    },
  },
];

export type ListingMapPin = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  areaSlug: ListingAreaSlug;
};

export function normalizeListingBuildingName(name: string): string {
  return name.trim().toLocaleLowerCase("fr");
}

export function listingAreaBySlug(slug: string | null | undefined): ListingArea | null {
  if (!slug) return null;
  const key = slug.trim().toLowerCase();
  return LISTING_AREAS.find((area) => area.slug === key) ?? null;
}

export function listingAreaForBuildingName(name: string | null | undefined): ListingArea | null {
  if (!name) return null;
  const key = normalizeListingBuildingName(name);
  return (
    LISTING_AREAS.find((area) =>
      area.buildings.some((building) => normalizeListingBuildingName(building) === key)
    ) ?? null
  );
}

export function listingsForArea(listings: Listing[], area: ListingArea): Listing[] {
  return listings.filter(
    (listing) => listingAreaForBuildingName(listing.building.name)?.slug === area.slug
  );
}

export function listingMapPins(listings: Listing[], area?: ListingArea | null): ListingMapPin[] {
  const source = area ? listingsForArea(listings, area) : listings;
  const pins: ListingMapPin[] = [];
  const seen = new Set<number>();
  for (const listing of source) {
    const building = listing.building;
    if (seen.has(building.id)) continue;
    const buildingArea = listingAreaForBuildingName(building.name);
    if (!buildingArea) continue;
    if (area && buildingArea.slug !== area.slug) continue;
    const { latitude, longitude } = building;
    if (typeof latitude !== "number" || typeof longitude !== "number") continue;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    seen.add(building.id);
    pins.push({
      id: building.id,
      name: building.name,
      latitude,
      longitude,
      areaSlug: buildingArea.slug,
    });
  }
  return pins;
}

export function parseListingView(raw: string | null): "grid" | "map" {
  return raw === "map" ? "map" : "grid";
}

/** Which listings panels to mount for the current URL. */
export function listingBrowserPanels(input: {
  hasArea: boolean;
  unknownArea: boolean;
  view: "grid" | "map";
  hasFeaturedUnit: boolean;
  /** Index `/listings?unit=` links wait, then redirect onto that building's area. */
  awaitingShareRedirect: boolean;
}): {
  mapVisible: boolean;
  showUnitGrid: boolean;
  showAreaIndex: boolean;
  redirectShare: boolean;
} {
  const redirectShare =
    !input.unknownArea &&
    !input.hasArea &&
    input.view !== "map" &&
    input.hasFeaturedUnit &&
    input.awaitingShareRedirect;
  const mapVisible = input.view === "map" && !input.unknownArea;
  const showUnitGrid =
    !input.unknownArea &&
    (input.hasArea || (input.hasFeaturedUnit && !redirectShare && input.view !== "map"));
  const showAreaIndex = !input.hasArea && !input.unknownArea && !showUnitGrid && !redirectShare;
  return { mapVisible, showUnitGrid, showAreaIndex, redirectShare };
}

export function listingAreaAbsoluteUrl(origin: string, slug: ListingAreaSlug): string {
  return `${origin.replace(/\/$/, "")}${listingAreaPath(slug)}`;
}

export function listingAreaPath(
  slug: ListingAreaSlug,
  query?: { view?: "grid" | "map" | null; building?: number | null; unit?: number | null }
): string {
  const params = new URLSearchParams();
  if (query?.view === "map" || query?.view === "grid") params.set("view", query.view);
  if (query?.building != null) params.set("building", String(query.building));
  if (query?.unit != null) params.set("unit", String(query.unit));
  const qs = params.toString();
  return qs ? `/listings/${slug}?${qs}` : `/listings/${slug}`;
}
