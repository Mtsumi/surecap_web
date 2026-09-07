"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  fetchAddressDetails,
  suggestAddresses,
  type AddressPrediction,
} from "@/lib/api";
import { formattedAddressWithPostal } from "@/lib/canadianPostal";
import { Locale, t } from "@/lib/i18n";
import { moveSuggestionIndex } from "./addressSuggestNav";

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
const SUGGEST_DEBOUNCE_MS = 300;
const MIN_QUERY_LEN = 3;

/** Shared readiness promise so concurrent callers await the callback, not script `load`. */
let mapsLoadPromise: Promise<void> | null = null;

function markMapsScriptFailed(script: HTMLScriptElement) {
  script.dataset.surecapMapsFailed = "1";
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps?.places) {
    return Promise.resolve();
  }

  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-surecap-maps="1"]'
  );
  if (existing?.dataset.surecapMapsFailed === "1") {
    return Promise.reject(MAPS_LOAD_ERROR);
  }

  if (mapsLoadPromise) {
    return mapsLoadPromise;
  }

  mapsLoadPromise = new Promise<void>((resolve, reject) => {
    const settleOk = () => {
      if (window.google?.maps?.places) {
        resolve();
        return;
      }
      mapsLoadPromise = null;
      reject(MAPS_LOAD_ERROR);
    };
    const settleErr = (script: HTMLScriptElement) => {
      markMapsScriptFailed(script);
      mapsLoadPromise = null;
      reject(MAPS_LOAD_ERROR);
    };

    if (window.google?.maps?.places) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-surecap-maps="1"]'
    );
    if (existingScript) {
      if (existingScript.dataset.surecapMapsFailed === "1") {
        settleErr(existingScript);
        return;
      }
      const previous = window.__surecapMapsInit;
      window.__surecapMapsInit = () => {
        previous?.();
        settleOk();
      };
      existingScript.addEventListener(
        "error",
        () => settleErr(existingScript),
        { once: true }
      );
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

function newSessionToken(): google.maps.places.AutocompleteSessionToken {
  return new google.maps.places.AutocompleteSessionToken();
}

function newServerSessionToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function postalFromComponents(
  components: Array<{ long_name?: string; types?: string[] }> | undefined
): string | undefined {
  return components?.find((component) => component.types?.includes("postal_code"))
    ?.long_name;
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
  const listId = `${inputId}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const bindGenerationRef = useRef(0);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionTokenRef = useRef(newServerSessionToken());
  const skipSuggestRef = useRef(false);
  const [mapsFailed, setMapsFailed] = useState(false);
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [suggestError, setSuggestError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const useServerSuggest = !manualOnly && (mapsFailed || !apiKey);

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
      fields: ["formatted_address", "place_id", "address_components"],
      types: ["address"],
      componentRestrictions: { country: "ca" },
      sessionToken,
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const formatted = formattedAddressWithPostal(
        place?.formatted_address || "",
        postalFromComponents(place?.address_components)
      );
      if (formatted && inputRef.current) {
        inputRef.current.value = formatted;
        onChangeRef.current(formatted, place.place_id);
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
      if (autocompleteRef.current) {
        clearAutocompleteListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
      if (manualOnly) setMapsFailed(false);
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

  useEffect(() => {
    if (!useServerSuggest) {
      setPredictions([]);
      setListOpen(false);
      return;
    }
    if (skipSuggestRef.current) {
      skipSuggestRef.current = false;
      return;
    }
    const query = value.trim();
    if (query.length < MIN_QUERY_LEN) {
      setPredictions([]);
      setListOpen(false);
      setSuggestError(false);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      void suggestAddresses(query, {
        sessionToken: sessionTokenRef.current,
        language: locale,
      })
        .then((data) => {
          if (controller.signal.aborted) return;
          setPredictions(data.predictions ?? []);
          setListOpen((data.predictions ?? []).length > 0);
          setActiveIndex(-1);
          setSuggestError(false);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setPredictions([]);
          setListOpen(false);
          setSuggestError(true);
        });
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [useServerSuggest, value, locale]);

  const pickPrediction = async (prediction: AddressPrediction) => {
    try {
      const details = await fetchAddressDetails(prediction.place_id, {
        sessionToken: sessionTokenRef.current,
        language: locale,
      });
      sessionTokenRef.current = newServerSessionToken();
      skipSuggestRef.current = true;
      if (inputRef.current) inputRef.current.value = details.formatted_address;
      onChange(details.formatted_address, details.place_id);
      setPredictions([]);
      setListOpen(false);
      setSuggestError(false);
    } catch {
      setSuggestError(true);
    }
  };

  const showManualHint = manualOnly;

  return (
    <label className="relative block text-sm text-[#57534e]" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        ref={inputRef}
        type="text"
        required={required}
        role="combobox"
        aria-expanded={useServerSuggest && listOpen}
        aria-controls={useServerSuggest ? listId : undefined}
        aria-autocomplete={useServerSuggest ? "list" : undefined}
        autoComplete={
          apiKey && !manualOnly && !mapsFailed && !useServerSuggest
            ? "off"
            : "street-address"
        }
        defaultValue={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (useServerSuggest) setListOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setListOpen(false);
            syncInputFromProp();
          }, 150);
        }}
        onFocus={() => {
          if (!manualOnly && apiKey && !mapsFailed && !autocompleteRef.current) {
            loadAndBind(bindGenerationRef.current);
          }
          if (useServerSuggest && predictions.length) setListOpen(true);
        }}
        onKeyDown={(e) => {
          if (!useServerSuggest || !listOpen || predictions.length === 0) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const key = e.key;
            setActiveIndex((index) =>
              moveSuggestionIndex(index, key, predictions.length)
            );
          } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            void pickPrediction(predictions[activeIndex]);
          } else if (e.key === "Escape") {
            setListOpen(false);
          }
        }}
        className={inputClass}
        placeholder={
          showManualHint
            ? t(locale, "addressManualHint")
            : t(locale, "addressPickHint")
        }
      />
      {useServerSuggest && listOpen && predictions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-[#e7e5e4] bg-white py-1 shadow-md"
        >
          {predictions.map((prediction, index) => (
            <li key={prediction.place_id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={`block w-full px-3 py-2 text-left text-sm ${
                  index === activeIndex ? "bg-[#f5f5f4]" : "hover:bg-[#f5f5f4]"
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  void pickPrediction(prediction);
                }}
              >
                {prediction.description}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {suggestError && useServerSuggest ? (
        <p className="mt-1 text-xs text-[#78716c]">{t(locale, "addressSuggestionsUnavailable")}</p>
      ) : null}
    </label>
  );
}
