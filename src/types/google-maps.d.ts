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
    getPlace(): { formatted_address?: string; place_id?: string };
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
}

declare const google: {
  maps: typeof google.maps;
};
