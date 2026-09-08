export type ListingPhoto = {
  src: string;
};

/**
 * Placeholder gallery until real unit photos exist.
 * Swap later: prefer `listing.photos` from the API (see listingImageSrcs).
 */
export const LISTING_PLACEHOLDER_PHOTOS: ListingPhoto[] = [
  { src: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80" },
  { src: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80" },
  { src: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80" },
  { src: "https://images.unsplash.com/photo-1560448204-e02f11e3a2e0?auto=format&fit=crop&w=1200&q=80" },
  { src: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80" },
  { src: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80" },
  { src: "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80" },
  { src: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80" },
];

const PHOTOS_PER_LISTING = 3;

export function listingPhotosFor(unitId: number): ListingPhoto[] {
  const start = Math.abs(unitId) % LISTING_PLACEHOLDER_PHOTOS.length;
  return Array.from({ length: PHOTOS_PER_LISTING }, (_, offset) => {
    return LISTING_PLACEHOLDER_PHOTOS[(start + offset) % LISTING_PLACEHOLDER_PHOTOS.length];
  });
}
