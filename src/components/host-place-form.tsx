"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { savePlace } from "@/lib/actions";
import { GoogleAddressPicker } from "@/components/google-address-picker";
import { PlacePhotoGalleryField } from "@/components/place-photo-gallery-form";

type HostPlace = {
  nickname: string;
  address: string;
  googlePlaceId: string | null;
  latitude: number | null;
  longitude: number | null;
  addressLine1: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressRegion: string | null;
  addressCountry: string | null;
  addressPostalCode: string | null;
  arrivalNotes: string;
  amenities: string;
  defaultCapacity: number;
  photos: { id: string; url: string }[];
};

const initialState = {
  status: "idle" as const,
  message: "",
};

function SubmitButton({ hasPlace, photoBusy }: { hasPlace: boolean; photoBusy: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending || photoBusy}>
      {photoBusy ? "Subiendo fotos..." : pending ? "Guardando..." : hasPlace ? "Guardar" : "Crear mi lugar"}
    </button>
  );
}

export function HostPlaceForm({
  place,
  googleMapsApiKey,
}: {
  place: HostPlace | null;
  googleMapsApiKey: string;
}) {
  const [nickname, setNickname] = useState(place?.nickname ?? "");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [state, formAction] = useActionState(savePlace, initialState);
  const statusClass = state.status === "error" ? "text-clay" : "text-olive";

  return (
    <form action={formAction} className="card space-y-3 p-5">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="place-nickname" className="label">
            Nombre
          </label>
          <input
            id="place-nickname"
            name="nickname"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="El Nido"
            required
            className="input"
          />
        </div>
        <div>
          <label htmlFor="place-capacity" className="label">
            Lugares por defecto
          </label>
          <input
            id="place-capacity"
            name="defaultCapacity"
            type="number"
            min={1}
            max={20}
            defaultValue={place?.defaultCapacity ?? 4}
            className="input"
          />
        </div>
      </div>
      <GoogleAddressPicker apiKey={googleMapsApiKey} place={place} />
      <div>
        <label htmlFor="place-arrival-notes" className="label">
          Cómo llegar (lo ven los que van)
        </label>
        <textarea
          id="place-arrival-notes"
          name="arrivalNotes"
          defaultValue={place?.arrivalNotes ?? ""}
          placeholder="Tocá 3B, el perro es amigable, la clave del wifi está en la heladera"
          rows={2}
          className="input"
        />
      </div>
      <div>
        <label htmlFor="place-amenities" className="label">
          El setup (separado por comas)
        </label>
        <input
          id="place-amenities"
          name="amenities"
          defaultValue={place?.amenities ?? ""}
          placeholder="wifi rápido, 2 monitores, café, balcón"
          className="input"
        />
      </div>

      <div className="pt-1">
        <PlacePhotoGalleryField
          photos={place?.photos ?? []}
          placeName={nickname}
          onBusyChange={setPhotoBusy}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className={`min-h-5 text-sm font-bold ${statusClass}`}>
          {state.message}
        </p>
        <SubmitButton hasPlace={Boolean(place)} photoBusy={photoBusy} />
      </div>
    </form>
  );
}
