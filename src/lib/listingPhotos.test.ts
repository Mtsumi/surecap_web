import { describe, expect, it } from "vitest";
import { LISTING_PLACEHOLDER_PHOTOS, listingPhotoFor } from "./listingPhotos";

describe("listingPhotos", () => {
  it("picks a stable placeholder per unit id", () => {
    const first = listingPhotoFor(10);
    expect(first).toBe(listingPhotoFor(10));
    expect(listingPhotoFor(11)).not.toBe(first);
    expect(LISTING_PLACEHOLDER_PHOTOS).toContain(first);
    expect(first.src.startsWith("https://images.unsplash.com/")).toBe(true);
  });
});
