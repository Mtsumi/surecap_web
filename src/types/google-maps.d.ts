declare namespace google.maps.places {
  class AutocompleteSessionToken {
    constructor();
  }

  class Autocomplete {
    constructor(
      input: HTMLInputElement,
      opts?: {
        fields?: string[];
        types?: string[];
        componentRestrictions?: { country: string | string[] };
        sessionToken?: AutocompleteSessionToken;
      }
    );
    addListener(event: string, handler: () => void): void;
    getPlace(): {
      formatted_address?: string;
      place_id?: string;
      address_components?: Array<{ long_name?: string; types?: string[] }>;
    };
    setOptions(opts: {
      sessionToken?: AutocompleteSessionToken;
      componentRestrictions?: { country: string | string[] };
    }): void;
  }
}

declare namespace google.maps {
  namespace places {
    class AutocompleteSessionToken {
      constructor();
    }
  }

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  interface MapOptions {
    center?: LatLngLiteral;
    zoom?: number;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    clickableIcons?: boolean;
    gestureHandling?: string;
  }

  class Map {
    constructor(el: HTMLElement, opts?: MapOptions);
    fitBounds(bounds: LatLngBounds, padding?: number): void;
    setCenter(latlng: LatLngLiteral): void;
    setZoom(zoom: number): void;
  }

  interface MarkerLabel {
    text: string;
    color?: string;
    fontSize?: string;
    fontWeight?: string;
  }

  interface MarkerOptions {
    map?: Map | null;
    position?: LatLngLiteral;
    title?: string;
    label?: string | MarkerLabel;
  }

  class Marker {
    constructor(opts?: MarkerOptions);
    addListener(event: string, handler: () => void): { remove: () => void };
    setMap(map: Map | null): void;
  }

  class LatLngBounds {
    constructor();
    extend(point: LatLngLiteral): LatLngBounds;
    isEmpty(): boolean;
  }
}

declare const google: {
  maps: typeof google.maps;
};
