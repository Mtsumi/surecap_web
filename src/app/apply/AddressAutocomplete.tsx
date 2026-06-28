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
  manualOnly?: boolean;
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
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-surecap-maps="1"]'
    );
    if (existing) {
      if (window.google?.maps?.places) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps")), {
        once: true,
      });
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

function newSessionToken(): google.maps.places.AutocompleteSessionToken {
  return new google.maps.places.AutocompleteSessionToken();
}

export default function AddressAutocomplete({
  locale,
  label,
  value,
  onChange,
  required,
  inputClass,
  manualOnly = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  onChangeRef.current = onChange;

  useEffect(() => {
    if (!apiKey || !inputRef.current || manualOnly) return;

    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !inputRef.current || !window.google) return;

        const sessionToken = newSessionToken();
        const autocomplete = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            fields: ["formatted_address", "place_id"],
            types: ["address"],
            componentRestrictions: { country: "ca" },
            sessionToken,
          }
        );

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place?.formatted_address) {
            onChangeRef.current(place.formatted_address, place.place_id);
          }
          autocomplete.setOptions({ sessionToken: newSessionToken() });
        });

        autocompleteRef.current = autocomplete;
      })
      .catch(() => {
        /* plain text fallback when Maps script fails */
      });

    return () => {
      cancelled = true;
      autocompleteRef.current = null;
    };
  }, [apiKey, manualOnly]);

  const showManualHint = manualOnly || !apiKey;

  return (
    <label className="block text-sm text-[#57534e]">
      {label}
      <input
        ref={inputRef}
        type="text"
        required={required}
        autoComplete={apiKey && !manualOnly ? "off" : "street-address"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        placeholder={showManualHint ? t(locale, "addressManualHint") : undefined}
      />
    </label>
  );
}
