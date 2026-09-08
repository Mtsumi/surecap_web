export type ListingPhoto = {
  src: string;
  photographer: string;
  unsplashUrl: string;
};

/** Curated Unsplash interiors/exteriors for Steve's preview — not actual units. */
export const LISTING_PLACEHOLDER_PHOTOS: ListingPhoto[] = [
  {
    src: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
    photographer: "Naomi Hébert",
    unsplashUrl: "https://unsplash.com/photos/3wylDrjxH-E",
  },
  {
    src: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
    photographer: "Sidekix Media",
    unsplashUrl: "https://unsplash.com/photos/MP0bgaS_d1c",
  },
  {
    src: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
    photographer: "Camille Brodard",
    unsplashUrl: "https://unsplash.com/photos/8sTBqug8tt0",
  },
  {
    src: "https://images.unsplash.com/photo-1560448204-e02f11e3a2e0?auto=format&fit=crop&w=1200&q=80",
    photographer: "Spacejoy",
    unsplashUrl: "https://unsplash.com/photos/x3njtPDP2fA",
  },
  {
    src: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80",
    photographer: "Collov Home Design",
    unsplashUrl: "https://unsplash.com/photos/a-O7oD_o0prI",
  },
  {
    src: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80",
    photographer: "Iñaki del Olmo",
    unsplashUrl: "https://unsplash.com/photos/wivoH6TWhN8",
  },
  {
    src: "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80",
    photographer: "Ralph (Ravi) Kayden",
    unsplashUrl: "https://unsplash.com/photos/2d4lAQAlbDA",
  },
  {
    src: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    photographer: "R ARCHITECTURE",
    unsplashUrl: "https://unsplash.com/photos/2gDwlIim3Uw",
  },
];

export function listingPhotoFor(unitId: number): ListingPhoto {
  const index = Math.abs(unitId) % LISTING_PLACEHOLDER_PHOTOS.length;
  return LISTING_PLACEHOLDER_PHOTOS[index];
}
