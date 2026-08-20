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

const MAPS_LOAD_ERROR = new Error("Failed to load Google Maps");

function markMapsScriptFailed(script: HTMLScriptElement) {
  script.dataset.surecapMapsFailed = "1";
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
      // Prior load already failed — later error listeners never fire.
      if (existing.dataset.surecapMapsFailed === "1") {
        reject(MAPS_LOAD_ERROR);
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => {
          markMapsScriptFailed(existing);
          reject(MAPS_LOAD_ERROR);
        },
        { once: true }
      );
      return;
    }
    window.__surecapMapsInit = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=__surecapMapsInit`;
    script.async = true;
    script.dataset.surecapMaps = "1";
    script.onerror = () => {
      markMapsScriptFailed(script);
      reject(MAPS_LOAD_ERROR);
    };
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
  /** Bumped on cleanup so stale focus/effect loads do not rebind. */
  const bindGenerationRef = useRef(0);
  const [mapsFailed, setMapsFailed] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const syncInputFromProp = useCallback(() => {
    const el = inputRef.current;
    if (!el || el.value === value) return;
    el.value = value;
  }, [value]);

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

  const loadAndBind = useCallback(
    (generation: number) => {
      if (!apiKey || manualOnly) return;
      void loadGoogleMaps(apiKey)
        .then(() => {
          if (bindGenerationRef.current !== generation) return;
          if (bindAutocomplete()) {
            setMapsFailed(false);
          }
        })
        .catch(() => {
          if (bindGenerationRef.current === generation) {
            setMapsFailed(true);
          }
        });
    },
    [apiKey, manualOnly, bindAutocomplete]
  );

  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    syncInputFromProp();
  }, [syncInputFromProp]);

  useEffect(() => {
    if (!apiKey || manualOnly) {
      setMapsFailed(false);
      if (autocompleteRef.current) {
        clearAutocompleteListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
      return;
    }

    const generation = ++bindGenerationRef.current;
    loadAndBind(generation);

    return () => {
      bindGenerationRef.current += 1;
      if (autocompleteRef.current) {
        clearAutocompleteListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [apiKey, manualOnly, fieldKey, loadAndBind]);

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
        onBlur={() => syncInputFromProp()}
        onFocus={() => {
          if (!manualOnly && apiKey && !mapsFailed && !autocompleteRef.current) {
            loadAndBind(bindGenerationRef.current);
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
