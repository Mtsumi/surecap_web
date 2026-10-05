import { describe, expect, it } from "vitest";
import type { Listing } from "./api";
import {
  LISTING_AREAS,
  listingAreaBySlug,
  listingAreaForBuildingName,
  listingAreaAbsoluteUrl,
  listingAreaPath,
  listingBrowserPanels,
  listingMapPins,
  listingsForArea,
  parseListingView,
} from "./listingAreas";

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 10,
    unit_number: "096",
    civic_number: "3270",
    rent: 1450,
    available_date: null,
    earliest_move_in_date: "2026-09-09",
    building: {
      id: 1,
      name: "Goyer",
      address: "3270 Rue Goyer",
      latitude: 45.505,
      longitude: -73.634,
    },
    ...overrides,
  };
}

describe("listingAreas", () => {
  it("keeps the six public areas separate from Dropbox folder names", () => {
    expect(LISTING_AREAS.map((area) => area.slug)).toEqual([
      "cote-des-neiges",
      "plateau",
      "lachine",
      "west-island",
      "villeray",
      "rosemont",
    ]);
    expect(listingAreaBySlug("cote-des-neiges")?.buildings).toEqual(["Dupuis", "Goyer", "Linton"]);
    expect(listingAreaBySlug("WEST-ISLAND")?.labels.fr).toBe("Ouest-de-l'Île");
    expect(listingAreaBySlug("cdn")).toBeNull();
    expect(new Set(LISTING_AREAS.map((area) => area.image)).size).toBe(LISTING_AREAS.length);
    expect(LISTING_AREAS.every((area) => area.image.startsWith("/listings/areas/"))).toBe(true);
    expect(listingAreaBySlug("nope")).toBeNull();
  });

  it("matches buildings by name and filters listings to an area", () => {
    const goyer = listing();
    const dupuis = listing({
      id: 11,
      building: {
        id: 2,
        name: "Dupuis",
        address: "3717 Av. Dupuis",
        latitude: 45.498,
        longitude: -73.627,
      },
    });
    const plateau = listing({
      id: 12,
      building: {
        id: 3,
        name: "deBullion",
        address: "4270 Rue De Bullion",
        latitude: 45.52,
        longitude: -73.582,
      },
    });
    const all = [goyer, dupuis, plateau];
    const cdn = listingAreaBySlug("cote-des-neiges");
    expect(cdn).not.toBeNull();
    expect(listingsForArea(all, cdn!).map((row) => row.id)).toEqual([10, 11]);
    expect(listingAreaForBuildingName("deBullion")?.slug).toBe("plateau");
    expect(listingAreaForBuildingName("Masson")?.slug).toBe("rosemont");
    expect(listingAreaForBuildingName("Unknown")).toBeNull();
  });

  it("puts one pin on each building that has coordinates and a vacancy", () => {
    const goyer = listing();
    const goyerOther = listing({ id: 15, unit_number: "101" });
    const noCoords = listing({
      id: 16,
      building: {
        id: 4,
        name: "Linton",
        address: "3400 Av. Linton",
        latitude: null,
        longitude: null,
      },
    });
    const duff = listing({
      id: 17,
      building: {
        id: 5,
        name: "Duff",
        address: "13067 Rue Duff",
        latitude: 45.504,
        longitude: -73.841,
      },
    });
    const pins = listingMapPins([goyer, goyerOther, noCoords, duff]);
    expect(pins.map((pin) => pin.name)).toEqual(["Goyer", "Duff"]);
    expect(listingMapPins([goyer, duff], listingAreaBySlug("lachine"))).toEqual([]);
    expect(listingMapPins([goyer, duff], listingAreaBySlug("cote-des-neiges")).map((pin) => pin.id)).toEqual([
      1,
    ]);
  });

  it("parses the view toggle and builds area links", () => {
    expect(parseListingView(null)).toBe("grid");
    expect(parseListingView("grid")).toBe("grid");
    expect(parseListingView("map")).toBe("map");
    expect(listingAreaPath("lachine")).toBe("/listings/lachine");
    expect(listingAreaAbsoluteUrl("https://montrealliving.info/", "lachine")).toBe(
      "https://montrealliving.info/listings/lachine"
    );
    expect(listingAreaPath("lachine", { view: "map" })).toBe("/listings/lachine?view=map");
    expect(listingAreaPath("cote-des-neiges", { building: 2, unit: 11 })).toBe(
      "/listings/cote-des-neiges?building=2&unit=11"
    );
  });

  it("hides the unit grid on an unknown area, including featured-unit links", () => {
    expect(
      listingBrowserPanels({
        hasArea: false,
        unknownArea: true,
        view: "grid",
        hasFeaturedUnit: true,
        awaitingShareRedirect: false,
      })
    ).toEqual({
      mapVisible: false,
      showUnitGrid: false,
      showAreaIndex: false,
      redirectShare: false,
    });
    expect(
      listingBrowserPanels({
        hasArea: false,
        unknownArea: true,
        view: "map",
        hasFeaturedUnit: false,
        awaitingShareRedirect: false,
      }).mapVisible
    ).toBe(false);
    expect(
      listingBrowserPanels({
        hasArea: true,
        unknownArea: false,
        view: "grid",
        hasFeaturedUnit: false,
        awaitingShareRedirect: false,
      }).showUnitGrid
    ).toBe(true);
    expect(
      listingBrowserPanels({
        hasArea: false,
        unknownArea: false,
        view: "grid",
        hasFeaturedUnit: true,
        awaitingShareRedirect: true,
      }).redirectShare
    ).toBe(true);
  });
});
