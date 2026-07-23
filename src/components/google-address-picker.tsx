"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { useEffect, useMemo, useRef, useState } from "react";

export type PlaceAddressValue = {
  address: string;
  googlePlaceId: string;
  latitude: string;
  longitude: string;
  addressLine1: string;
  addressNeighborhood: string;
  addressCity: string;
  addressRegion: string;
  addressCountry: string;
  addressPostalCode: string;
};

type StoredPlaceAddress = {
  address: string;
  googlePlaceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  addressLine1?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressRegion?: string | null;
  addressCountry?: string | null;
  addressPostalCode?: string | null;
};

type PickerStatus = "idle" | "loading" | "ready" | "error";

let configuredApiKey: string | null = null;
let placesLibraryPromise: Promise<google.maps.PlacesLibrary> | null = null;

function initialAddressValue(place: StoredPlaceAddress | null): PlaceAddressValue {
  return {
    address: place?.address ?? "",
    googlePlaceId: place?.googlePlaceId ?? "",
    latitude: place?.latitude == null ? "" : String(place.latitude),
    longitude: place?.longitude == null ? "" : String(place.longitude),
    addressLine1: place?.addressLine1 ?? "",
    addressNeighborhood: place?.addressNeighborhood ?? "",
    addressCity: place?.addressCity ?? "",
    addressRegion: place?.addressRegion ?? "",
    addressCountry: place?.addressCountry ?? "",
    addressPostalCode: place?.addressPostalCode ?? "",
  };
}

function manualAddressValue(address: string): PlaceAddressValue {
  return {
    address,
    googlePlaceId: "",
    latitude: "",
    longitude: "",
    addressLine1: "",
    addressNeighborhood: "",
    addressCity: "",
    addressRegion: "",
    addressCountry: "",
    addressPostalCode: "",
  };
}

function loadPlacesLibrary(apiKey: string) {
  if (!configuredApiKey) {
    setOptions({
      key: apiKey,
      v: "weekly",
      language: "es",
      region: "AR",
      authReferrerPolicy: "origin",
    });
    configuredApiKey = apiKey;
  }

  placesLibraryPromise ??= importLibrary("places");
  return placesLibraryPromise;
}

function componentText(
  components: google.maps.places.AddressComponent[] | undefined,
  types: string[],
  variant: "long" | "short" = "long"
) {
  const component = components?.find((item) => types.some((type) => item.types.includes(type)));
  return (variant === "short" ? component?.shortText : component?.longText) ?? "";
}

function parsePlace(place: google.maps.places.Place): PlaceAddressValue {
  const components = place.addressComponents;
  const streetAddress = componentText(components, ["street_address"]);
  const route = componentText(components, ["route"]);
  const streetNumber = componentText(components, ["street_number"]);
  const postalCode = [
    componentText(components, ["postal_code"]),
    componentText(components, ["postal_code_suffix"]),
  ]
    .filter(Boolean)
    .join("-");
  const location = place.location;

  return {
    address: place.formattedAddress ?? [route, streetNumber].filter(Boolean).join(" "),
    googlePlaceId: place.id,
    latitude: location ? String(location.lat()) : "",
    longitude: location ? String(location.lng()) : "",
    addressLine1: streetAddress || [route, streetNumber].filter(Boolean).join(" "),
    addressNeighborhood: componentText(components, ["neighborhood", "sublocality_level_1"]),
    addressCity: componentText(components, [
      "locality",
      "postal_town",
      "administrative_area_level_2",
    ]),
    addressRegion: componentText(components, ["administrative_area_level_1"], "short"),
    addressCountry: componentText(components, ["country"]),
    addressPostalCode: postalCode,
  };
}

function HiddenAddressFields({
  value,
  includeAddress = true,
}: {
  value: PlaceAddressValue;
  includeAddress?: boolean;
}) {
  return (
    <>
      {includeAddress && <input type="hidden" name="address" value={value.address} />}
      <input type="hidden" name="googlePlaceId" value={value.googlePlaceId} />
      <input type="hidden" name="latitude" value={value.latitude} />
      <input type="hidden" name="longitude" value={value.longitude} />
      <input type="hidden" name="addressLine1" value={value.addressLine1} />
      <input type="hidden" name="addressNeighborhood" value={value.addressNeighborhood} />
      <input type="hidden" name="addressCity" value={value.addressCity} />
      <input type="hidden" name="addressRegion" value={value.addressRegion} />
      <input type="hidden" name="addressCountry" value={value.addressCountry} />
      <input type="hidden" name="addressPostalCode" value={value.addressPostalCode} />
    </>
  );
}

export function GoogleAddressPicker({
  apiKey,
  place,
}: {
  apiKey: string;
  place: StoredPlaceAddress | null;
}) {
  const startingValue = useMemo(() => initialAddressValue(place), [place]);
  const [value, setValue] = useState(startingValue);
  const [status, setStatus] = useState<PickerStatus>(apiKey ? "loading" : "idle");
  const containerRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;

    let disposed = false;
    let autocomplete: google.maps.places.PlaceAutocompleteElement | null = null;
    let removeListeners = () => {};
    let suppressInput = false;
    const container = containerRef.current;

    async function fillFromPrediction(placePrediction: google.maps.places.PlacePrediction) {
      try {
        setStatus("loading");
        const place = placePrediction.toPlace();
        await place.fetchFields({
          fields: ["id", "formattedAddress", "location", "addressComponents"],
        });
        if (disposed) return;

        const nextValue = parsePlace(place);
        if (!nextValue.address || !nextValue.googlePlaceId || !nextValue.latitude || !nextValue.longitude) {
          setStatus("error");
          return;
        }

        setValue(nextValue);
        if (autocomplete) {
          suppressInput = true;
          autocomplete.value = nextValue.address;
          window.setTimeout(() => {
            suppressInput = false;
          }, 0);
        }
        setStatus("ready");
      } catch {
        if (!disposed) setStatus("error");
      }
    }

    loadPlacesLibrary(apiKey)
      .then(({ PlaceAutocompleteElement }) => {
        if (disposed) return;

        autocomplete = new PlaceAutocompleteElement({
          description: "Dirección del lugar",
          includedPrimaryTypes: ["street_address"],
          includedRegionCodes: ["AR"],
          noClearButton: true,
          noInputIcon: true,
          requestedLanguage: "es",
          requestedRegion: "AR",
        });
        autocomplete.placeholder = "Gorriti 4380, Palermo";
        autocomplete.value = valueRef.current.address;

        const handleSelect: EventListener = (event) => {
          const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
          void fillFromPrediction(selectEvent.placePrediction);
        };
        const handleInput = () => {
          if (suppressInput) return;
          setValue(manualAddressValue(autocomplete?.value.trim() ?? ""));
          setStatus("ready");
        };
        const handleError = () => setStatus("error");

        autocomplete.addEventListener("gmp-select", handleSelect);
        autocomplete.addEventListener("input", handleInput);
        autocomplete.addEventListener("gmp-error", handleError);
        removeListeners = () => {
          autocomplete?.removeEventListener("gmp-select", handleSelect);
          autocomplete?.removeEventListener("input", handleInput);
          autocomplete?.removeEventListener("gmp-error", handleError);
        };
        container.replaceChildren(autocomplete);
        setStatus("ready");
      })
      .catch(() => {
        if (!disposed) setStatus("error");
      });

    return () => {
      disposed = true;
      removeListeners();
      container.replaceChildren();
    };
  }, [apiKey]);

  if (!apiKey || status === "error") {
    return (
      <div>
        <label htmlFor="place-address" className="label">
          Dirección
        </label>
        <input
          id="place-address"
          name="address"
          value={value.address}
          onChange={(event) => setValue(manualAddressValue(event.target.value))}
          placeholder="Gorriti 4380, Palermo"
          required
          className="input"
        />
        <HiddenAddressFields value={value} includeAddress={false} />
      </div>
    );
  }

  return (
    <div>
      <p className="label">Dirección</p>
      <div className="maps-address-shell" ref={containerRef} aria-busy={status === "loading"} />
      <HiddenAddressFields value={value} />
    </div>
  );
}
