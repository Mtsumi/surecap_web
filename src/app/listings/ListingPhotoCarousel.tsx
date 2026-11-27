"use client";

import { useEffect, useRef, useState } from "react";
import type { ListingGalleryItem } from "@/lib/listingDisplay";

type ListingPhotoCarouselProps = {
  media: ListingGalleryItem[];
  rentLabel: string | null;
  prevLabel: string;
  nextLabel: string;
};

export default function ListingPhotoCarousel({
  media,
  rentLabel,
  prevLabel,
  nextLabel,
}: ListingPhotoCarouselProps) {
  const [index, setIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const [upgraded, setUpgraded] = useState<Record<number, boolean>>({});
  const touchStartX = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const count = media.length;
  const safeIndex = count === 0 ? 0 : Math.min(index, count - 1);
  const current = media[safeIndex] ?? media[0];
  // Covers stay on thumbs; full-res only after the user swipes/navigates to a slide.
  const imageSrc =
    current?.kind === "image" && upgraded[safeIndex] && current.fullSrc
      ? current.fullSrc
      : current?.src;

  useEffect(() => {
    if (count === 0) {
      setIndex(0);
      return;
    }
    setIndex((currentIndex) => Math.min(currentIndex, count - 1));
  }, [count]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setInView(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.35 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const go = (direction: number) => {
    if (count < 2) return;
    setIndex((currentIndex) => {
      const base = Math.min(currentIndex, count - 1);
      const next = (base + direction + count) % count;
      setUpgraded((prev) => (prev[next] ? prev : { ...prev, [next]: true }));
      return next;
    });
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (current?.kind === "video" && inView) {
      void video.play().catch(() => {
        /* autoplay may be blocked; controls remain */
      });
      return;
    }
    video.pause();
  }, [current, safeIndex, inView]);

  if (!current) {
    return <div className="aspect-[4/3] bg-[#ebe6dc]" />;
  }

  return (
    <div
      ref={rootRef}
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
      {current.kind === "video" ? (
        <video
          key={current.src}
          ref={videoRef}
          src={current.src}
          className="h-full w-full object-cover"
          muted
          playsInline
          loop
          controls
          preload="metadata"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      )}

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
            {media.map((item, photoIndex) => (
              <span
                key={`${item.fullSrc ?? item.src}-${photoIndex}`}
                className={`h-1.5 rounded-full transition-all ${
                  photoIndex === safeIndex ? "w-4 bg-white" : "w-1.5 bg-white/55"
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
