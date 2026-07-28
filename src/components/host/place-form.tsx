"use client";

import { useActionState, useCallback, useState } from "react";
import { savePlace } from "@/lib/actions";
import { GoogleAddressPicker } from "@/components/google-address-picker";
import { AmenitiesField } from "@/components/host/amenities-field";
import { NumberStepper } from "@/components/host/number-stepper";
import { PlacePhotoField } from "@/components/host/place-photo-field";
import type { HostFormState, HostPlaceData } from "@/components/host/types";

const initialState: HostFormState = {
  status: "idle",
  message: "",
};

/**
 * The house, edited. It shows up twice: once as the empty screen's only job
 * (`mode="create"`, four fields and the photos, nothing else), and once expanded
 * in place of the folded summary card (`mode="edit"`, everything).
 */
export function PlaceForm({
  place,
  googleMapsApiKey,
  mode,
  openDayCount = 0,
  onSaved,
  onCancel,
}: {
  place: HostPlaceData | null;
  googleMapsApiKey: string;
  mode: "create" | "edit";
  openDayCount?: number;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [nickname, setNickname] = useState(place?.nickname ?? "");
  const [capacity, setCapacity] = useState(place?.defaultCapacity ?? 4);
  const [photoBusy, setPhotoBusy] = useState(false);
  const editing = mode === "edit";

  const [state, formAction, pending] = useActionState(
    async (previous: HostFormState, formData: FormData) => {
      const result = await savePlace(previous, formData);
      if (result.status === "success") onSaved?.();
      return result;
    },
    initialState
  );

  // The photo field calls this on every render pass; a stable identity keeps its
  // effect from re-firing and flipping the busy flag back and forth.
  const handleBusyChange = useCallback((busy: boolean) => setPhotoBusy(busy), []);

  return (
    <form
      action={formAction}
      className={
        editing
          ? "card border-line p-5 sm:p-6"
          : "card border-coral-200 shadow-card p-5 sm:p-6"
      }
    >
      {editing && (
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-display text-[22px] font-bold text-ink">Editar mi casa</h2>
          {openDayCount > 0 && (
            <p className="font-mono text-[11px] leading-relaxed text-faded">
              se actualiza en tus {openDayCount} {openDayCount === 1 ? "día" : "días"} ya
              {openDayCount === 1 ? " abierto" : " abiertos"} — las sillas de esos días no cambian
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_162px]">
          <div>
            <label htmlFor="place-nickname" className="label">
              Cómo le decís
            </label>
            <input
              id="place-nickname"
              name="nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="El Nido"
              maxLength={60}
              required
              className="input"
            />
            {!editing && (
              <p className="mt-1.5 font-mono text-[11px] text-faded">
                “El Nido”, “Lo de Meli”, “El patio”
              </p>
            )}
          </div>
          <div>
            <p className="label">Sillas por defecto</p>
            <NumberStepper name="defaultCapacity" value={capacity} onChange={setCapacity} />
            {!editing && (
              <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-faded">
                cada día podés cambiarlas
              </p>
            )}
          </div>
        </div>

        <div>
          <GoogleAddressPicker apiKey={googleMapsApiKey} place={place} />
          <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-faded">
            la dirección exacta la ve solo quien se suma a un día
          </p>
        </div>

        {editing && (
          <>
            <div>
              <label htmlFor="place-arrival-notes" className="label">
                Cómo llegar
              </label>
              <textarea
                id="place-arrival-notes"
                name="arrivalNotes"
                defaultValue={place?.arrivalNotes ?? ""}
                placeholder="Tocá 3B, el perro es amigable, la clave del wifi está en la heladera"
                rows={2}
                maxLength={240}
                className="input resize-y leading-relaxed"
              />
            </div>
            <AmenitiesField defaultValue={place?.amenities ?? ""} />
          </>
        )}

        <PlacePhotoField
          photos={place?.photos ?? []}
          placeName={nickname}
          onBusyChange={handleBusyChange}
        />
      </div>

      <div
        className={`mt-5 flex flex-wrap items-center justify-between gap-3 ${
          editing ? "border-t border-line pt-4" : ""
        }`}
      >
        {state.message ? (
          <p
            aria-live="polite"
            className={`text-sm font-bold ${state.status === "error" ? "text-clay" : "text-olive"}`}
          >
            {state.message}
          </p>
        ) : (
          <p className="font-mono text-[11px] text-faded">
            {editing ? "" : "nadie se entera hasta que abras un día"}
          </p>
        )}
        <div className="flex items-center gap-2.5">
          {onCancel && (
            <button type="button" className="btn-ghost" onClick={onCancel} disabled={pending}>
              Descartar
            </button>
          )}
          <button className="btn-primary" disabled={pending || photoBusy}>
            {photoBusy
              ? "Subiendo fotos…"
              : pending
                ? "Guardando…"
                : editing
                  ? "Guardar cambios"
                  : "Crear mi casa"}
          </button>
        </div>
      </div>
    </form>
  );
}
