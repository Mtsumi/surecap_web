"use client";

import { useEffect, useRef } from "react";
import { Locale, t } from "@/lib/i18n";

type Props = {
  locale: Locale;
  label: string;
  value: string;
  onChange: (address: string, placeId?: string) => void;
  required?: boolean;
  inputClass: string;
};

declare global {
  interface Window {
    google?: typeof google;
    __surecapMapsInit?: () => void;
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps?.places) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-surecap-maps="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    window.__surecapMapsInit = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=__surecapMapsInit`;
    script.async = true;
    script.dataset.surecapMaps = "1";
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

export default function AddressAutocomplete({
  locale,
  label,
  value,
  onChange,
  required,
  inputClass,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;

    let autocomplete: google.maps.places.Autocomplete | null = null;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (!inputRef.current || !window.google) return;
        autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "place_id"],
          types: ["address"],
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete?.getPlace();
          if (place?.formatted_address) {
            onChange(place.formatted_address, place.place_id);
          }
        });
      })
      .catch(() => {
        /* plain text fallback */
      });

    return () => {
      autocomplete = null;
    };
  }, [apiKey, onChange]);

  return (
    <label className="block text-sm text-[#57534e]">
      {label}
      <input
        ref={inputRef}
        type="text"
        required={required}
        autoComplete="street-address"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        placeholder={apiKey ? undefined : t(locale, "addressManualHint")}
      />
    </label>
  );
}
