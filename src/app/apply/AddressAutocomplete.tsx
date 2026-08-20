"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Locale, t } from "@/lib/i18n";

type Props = {
  locale: Locale;
  label: string;
  value: string;
  onChange: (address: string, placeId?: string) => void;
  required?: boolean;
  inputClass: string;
  manualOnly?: boolean;
  /** Stable id per field — required when multiple autocompletes share a page. */
  fieldKey: string;
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=__surecapMapsInit`;
    script.async = true;
    script.dataset.surecapMaps = "1";
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

function newSessionToken(): google.maps.places.AutocompleteSessionToken {
  return new google.maps.places.AutocompleteSessionToken();
}

function clearAutocompleteListeners(autocomplete: google.maps.places.Autocomplete) {
  const eventApi = (
    window.google?.maps as typeof google.maps & {
      event?: { clearInstanceListeners: (instance: object) => void };
    }
  )?.event;
  eventApi?.clearInstanceListeners(autocomplete);
}

export default function AddressAutocomplete({
  locale,
  label,
  value,
  onChange,
  required,
  inputClass,
  manualOnly = false,
  fieldKey,
}: Props) {
  const reactId = useId();
  const inputId = `${fieldKey}-${reactId.replace(/:/g, "")}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [mapsFailed, setMapsFailed] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  onChangeRef.current = onChange;

  const bindAutocomplete = useCallback(() => {
    const input = inputRef.current;
    if (!input || !window.google?.maps?.places || manualOnly || !apiKey) return false;

    if (autocompleteRef.current) {
      clearAutocompleteListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }

    const sessionToken = newSessionToken();
    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      fields: ["formatted_address", "place_id"],
      types: ["address"],
      componentRestrictions: { country: "ca" },
      sessionToken,
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place?.formatted_address && inputRef.current) {
        inputRef.current.value = place.formatted_address;
        onChangeRef.current(place.formatted_address, place.place_id);
      }
      autocomplete.setOptions({ sessionToken: newSessionToken() });
    });

    autocompleteRef.current = autocomplete;
    return true;
  }, [apiKey, manualOnly]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el || document.activeElement === el) return;
    if (el.value !== value) {
      el.value = value;
    }
  }, [value]);

  useEffect(() => {
    if (!apiKey || manualOnly) {
      setMapsFailed(false);
      return;
    }

    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled) return;
        if (bindAutocomplete()) {
          setMapsFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setMapsFailed(true);
      });

    return () => {
      cancelled = true;
      if (autocompleteRef.current) {
        clearAutocompleteListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [apiKey, manualOnly, fieldKey, bindAutocomplete]);

  const showManualHint = manualOnly || !apiKey || mapsFailed;

  return (
    <label className="block text-sm text-[#57534e]" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        required={required}
        autoComplete={apiKey && !manualOnly && !mapsFailed ? "off" : "street-address"}
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (!manualOnly && apiKey && !mapsFailed && !autocompleteRef.current) {
            void loadGoogleMaps(apiKey)
              .then(() => {
                if (bindAutocomplete()) setMapsFailed(false);
              })
              .catch(() => setMapsFailed(true));
          }
        }}
        className={inputClass}
        placeholder={showManualHint ? t(locale, "addressManualHint") : undefined}
      />
      {mapsFailed && !manualOnly && apiKey ? (
        <p className="mt-1 text-xs text-[#78716c]">{t(locale, "addressSuggestionsUnavailable")}</p>
      ) : null}
    </label>
  );
}
