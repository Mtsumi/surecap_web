"use client";

import { useRef, useState } from "react";

type ListingPhotoCarouselProps = {
  photos: string[];
  rentLabel: string | null;
  prevLabel: string;
  nextLabel: string;
};

export default function ListingPhotoCarousel({
  photos,
  rentLabel,
  prevLabel,
  nextLabel,
}: ListingPhotoCarouselProps) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const count = photos.length;
  const current = photos[index] ?? photos[0];

  const go = (direction: number) => {
    if (count < 2) return;
    setIndex((currentIndex) => (currentIndex + direction + count) % count);
  };

  if (!current) {
    return <div className="aspect-[4/3] bg-[#ebe6dc]" />;
  }

  return (
    <div
      className="group relative aspect-[4/3] overflow-hidden bg-[#ebe6dc]"
      onTouchStart={(event) => {
        touchStartX.current = event.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        const end = event.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (start == null || end == null) return;
        const delta = end - start;
        if (delta > 40) go(-1);
        else if (delta < -40) go(1);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt=""
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        loading="lazy"
        draggable={false}
      />

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label={prevLabel}
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#1c1917]/45 text-white shadow-sm backdrop-blur-[2px] transition hover:bg-[#1c1917]/70"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            aria-label={nextLabel}
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#1c1917]/45 text-white shadow-sm backdrop-blur-[2px] transition hover:bg-[#1c1917]/70"
          >
            <ChevronRightIcon />
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {photos.map((_, photoIndex) => (
              <span
                key={photoIndex}
                className={`h-1.5 rounded-full transition-all ${
                  photoIndex === index ? "w-4 bg-white" : "w-1.5 bg-white/55"
                }`}
              />
            ))}
          </div>
        </>
      )}

      {rentLabel && (
        <span className="absolute right-3 top-3 rounded-full bg-[#fffef9]/95 px-3 py-1 text-sm font-semibold text-[#1c1917]">
          {rentLabel}
        </span>
      )}
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M15 6 9 12l6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
