"use client";

import { useEffect, useRef, useState } from "react";
import type { ListingMapPin } from "@/lib/listingAreas";

type Props = {
  pins: ListingMapPin[];
  unavailableLabel: string;
  onSelect: (pin: ListingMapPin) => void;
};

const MAPS_LOAD_ERROR = new Error("Failed to load Google Maps");
let mapsLoadPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps?.Map) return Promise.resolve();
  if (mapsLoadPromise) return mapsLoadPromise;

  const existing = document.querySelector<HTMLScriptElement>('script[data-surecap-maps="1"]');
  if (existing?.dataset.surecapMapsFailed === "1") return Promise.reject(MAPS_LOAD_ERROR);

  mapsLoadPromise = new Promise<void>((resolve, reject) => {
    const settleOk = () => {
      if (window.google?.maps?.Map) {
        resolve();
        return;
      }
      mapsLoadPromise = null;
      reject(MAPS_LOAD_ERROR);
    };
    const settleErr = (script: HTMLScriptElement) => {
      script.dataset.surecapMapsFailed = "1";
      mapsLoadPromise = null;
      reject(MAPS_LOAD_ERROR);
    };

    if (existing) {
      const previous = window.__surecapMapsInit;
      window.__surecapMapsInit = () => {
        previous?.();
        settleOk();
      };
      existing.addEventListener("error", () => settleErr(existing), { once: true });
      if (window.google?.maps?.Map) settleOk();
      return;
    }

    window.__surecapMapsInit = () => settleOk();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=__surecapMapsInit`;
    script.async = true;
    script.dataset.surecapMaps = "1";
    script.onerror = () => settleErr(script);
    document.head.appendChild(script);
  });

  return mapsLoadPromise;
}

export default function ListingsMap({ pins, unavailableLabel, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const [unavailable, setUnavailable] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || pins.length === 0) return;
    if (!apiKey) {
      setUnavailable(true);
      return;
    }

    let cancelled = false;
    const markers: google.maps.Marker[] = [];

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const first = pins[0];
        const map = new window.google!.maps.Map(containerRef.current, {
          center: { lat: first.latitude, lng: first.longitude },
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });
        const bounds = new window.google!.maps.LatLngBounds();
        for (const pin of pins) {
          const position = { lat: pin.latitude, lng: pin.longitude };
          const marker = new window.google!.maps.Marker({
            map,
            position,
            title: pin.name,
            label: {
              text: pin.name,
              color: "#292524",
              fontSize: "12px",
              fontWeight: "600",
            },
          });
          marker.addListener("click", () => onSelectRef.current(pin));
          markers.push(marker);
          bounds.extend(position);
        }
        if (pins.length === 1) {
          map.setCenter({ lat: first.latitude, lng: first.longitude });
          map.setZoom(15);
        } else if (!bounds.isEmpty()) {
          map.fitBounds(bounds, 48);
        }
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });

    return () => {
      cancelled = true;
      for (const marker of markers) marker.setMap(null);
    };
  }, [apiKey, pins]);

  if (!apiKey || unavailable) {
    return (
      <p className="rounded border border-[#e7e0d5] bg-[#fffef9] px-4 py-6 text-sm leading-relaxed text-[#57534e]">
        {unavailableLabel}
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-80 w-full overflow-hidden rounded-2xl border border-[#e7e0d5] sm:h-[28rem]"
      role="region"
      aria-label={pins.map((pin) => pin.name).join(", ")}
    />
  );
}
