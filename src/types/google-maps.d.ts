declare namespace google.maps.places {
  class Autocomplete {
    constructor(
      input: HTMLInputElement,
      opts?: { fields?: string[]; types?: string[] }
    );
    addListener(event: string, handler: () => void): void;
    getPlace(): { formatted_address?: string; place_id?: string };
  }
}

declare namespace google.maps {
  namespace places {}
}

declare const google: {
  maps: typeof google.maps;
};
