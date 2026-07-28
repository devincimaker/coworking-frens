"use client";

import { accentFor, stripes } from "@/lib/accent";
import { amenityList, areaLabel } from "@/lib/place";
import type { HostPlaceData } from "@/components/host/types";

/**
 * The house, folded. It is set up once and then mostly read, so on this screen it
 * earns a strip rather than a form — and gets out of the way of the day you came
 * here to open. What's missing is what it asks for: photos first, then the setup.
 */
export function PlaceSummary({
  place,
  hostId,
  onEdit,
}: {
  place: HostPlaceData;
  hostId: string;
  onEdit: () => void;
}) {
  const accent = accentFor(hostId);
  const photos = place.photos.slice(0, 3);
  const extra = place.photos.length - photos.length;
  const amenities = amenityList(place.amenities).slice(0, 4);
  const area = areaLabel(place);
  const hasPhotos = place.photos.length > 0;

  return (
    <div className="card mb-6 flex flex-wrap items-center gap-4 px-4 py-3.5">
      {hasPhotos ? (
        <div className="flex shrink-0 gap-1.5">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className={`relative h-16 overflow-hidden bg-paper ${
                index === 0 ? "w-[84px] rounded-2xl" : "w-11 rounded-xl"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={index === 0 ? `Foto de ${place.nickname}` : ""}
                className="h-full w-full object-cover"
              />
              {index === photos.length - 1 && extra > 0 && (
                <span className="absolute inset-0 flex items-center justify-center bg-ink/55 font-mono text-[11px] font-semibold text-white">
                  +{extra}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="flex h-16 w-[84px] shrink-0 items-center justify-center rounded-2xl"
          style={{ background: stripes(accent) }}
        >
          <span className="font-mono text-[11px] opacity-70" style={{ color: accent.accent }}>
            [ foto ]
          </span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h2 className="font-display text-xl font-bold text-ink">{place.nickname}</h2>
          <p className="text-[13px] text-faded">
            {area && `${area} · `}
            {place.defaultCapacity} sillas por defecto
          </p>
        </div>

        {!hasPhotos ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-faded">
            Sin fotos tu casa aparece rayada en el feed. Una alcanza.
          </p>
        ) : amenities.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {amenities.map((amenity) => (
              <span key={amenity} className="amenity">
                {amenity}
              </span>
            ))}
          </div>
        ) : (
          <button
            type="button"
            className="mt-2 cursor-pointer rounded-full border border-dashed border-rule-strong px-2.5 py-1 font-mono text-[11px] text-faded transition-colors hover:border-clay hover:text-clay"
            onClick={onEdit}
          >
            + contá qué hay: wifi, monitor, café…
          </button>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="flex gap-2">
          {!hasPhotos && (
            <button type="button" className="btn-primary" onClick={onEdit}>
              Sumar fotos
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={onEdit}>
            Editar mi casa
          </button>
        </div>
        <span className="font-mono text-[11px] text-faded">
          la dirección la ven los que se suman
        </span>
      </div>
    </div>
  );
}
