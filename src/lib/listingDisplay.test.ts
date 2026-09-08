import { describe, expect, it } from "vitest";
import {
  formatListingRent,
  formatQuebecSize,
  listingAddress,
  listingApplyHref,
  listingChips,
  listingFacts,
  listingImageSrcs,
  listingSharePath,
  listingShareUrl,
  listingsForBuilding,
  orderListingsWithFeatured,
  parseListingUnitId,
  uniqueListingBuildings,
} from "./listingDisplay";
import type { Listing } from "./api";

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 10,
    unit_number: "096",
    civic_number: "3270",
    rent: 1450,
    available_date: "immédiatement",
    earliest_move_in_date: "2026-09-09",
    amenities: { size: 3.5, bedrooms: 1, fridge_stove: true, balcony: false },
    building: {
      id: 1,
      name: "Goyer",
      address: "3270 Rue Goyer",
      latitude: null,
      longitude: null,
    },
    ...overrides,
  };
}

describe("listingDisplay", () => {
  it("builds apply and share URLs", () => {
    expect(listingApplyHref(1, 10)).toBe("/apply?building=1&unit=10");
    expect(listingSharePath(10)).toBe("/listings?unit=10");
    expect(listingShareUrl(10, "https://montrealliving.info/")).toBe(
      "https://montrealliving.info/listings?unit=10"
    );
    expect(listingAddress(listing())).toBe("3270 Rue Goyer");
    expect(listingImageSrcs(listing({ photos: ["https://cdn.example/real.jpg"] }))).toEqual([
      "https://cdn.example/real.jpg",
    ]);
    expect(listingImageSrcs(listing()).length).toBeGreaterThan(0);
  });

  it("formats Quebec ½ sizes and rent", () => {
    expect(formatQuebecSize(3.5)).toBe("3½");
    expect(formatQuebecSize(4)).toBe("4");
    expect(formatQuebecSize("3 1/2")).toBe("3½");
    expect(formatQuebecSize("chambre")).toBe("chambre");
    expect(formatListingRent(1450, "fr")).toMatch(/1\s*450 \$ \/mois/);
    expect(formatListingRent(1450, "en")).toBe("$1,450/mo");
  });

  it("shows only true amenity chips and size/bedroom facts", () => {
    const item = listing();
    expect(listingChips(item.amenities, "fr").map((chip) => chip.key)).toEqual([
      "fridge_stove",
    ]);
    expect(
      listingChips({ internet: "disponible", balcony: false }, "en").map((chip) => chip.key)
    ).toEqual(["internet"]);
    expect(listingFacts(item, "fr").map((fact) => fact.label)).toEqual([
      "3½",
      "1 chambre",
    ]);
    expect(
      listingFacts({ amenities: { size: 1.5, bedrooms: 0 } }, "en").map((fact) => fact.label)
    ).toEqual(["1½", "Studio"]);
  });

  it("filters, features, and parses unit ids", () => {
    const goyer = listing();
    const other = listing({
      id: 11,
      unit_number: "12",
      building: {
        id: 2,
        name: "Côte-des-Neiges",
        address: "1 Ave",
        latitude: null,
        longitude: null,
      },
    });
    const all = [goyer, other];
    expect(uniqueListingBuildings(all).map((b) => b.id)).toEqual([1, 2]);
    expect(listingsForBuilding(all, 2).map((row) => row.id)).toEqual([11]);
    expect(orderListingsWithFeatured(all, 11).map((row) => row.id)).toEqual([11, 10]);
    expect(parseListingUnitId("11")).toBe(11);
    expect(parseListingUnitId("nope")).toBeNull();
  });
});
