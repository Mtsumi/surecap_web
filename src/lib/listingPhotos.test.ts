import { describe, expect, it } from "vitest";
import { LISTING_PLACEHOLDER_PHOTOS, listingPhotosFor } from "./listingPhotos";

describe("listingPhotos", () => {
  it("returns a stable gallery per unit id", () => {
    const first = listingPhotosFor(10);
    expect(first).toHaveLength(3);
    expect(listingPhotosFor(10)).toEqual(first);
    expect(listingPhotosFor(11)[0]).not.toEqual(first[0]);
    expect(LISTING_PLACEHOLDER_PHOTOS).toContainEqual(first[0]);
    expect(first[0].src.startsWith("https://images.unsplash.com/")).toBe(true);
  });
});
