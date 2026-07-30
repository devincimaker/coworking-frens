"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { uploadOptimizedImage } from "@/components/image-upload-field";

type PlacePhoto = {
  id: string;
  url: string;
};

const MAX_PLACE_PHOTOS = 9;

function moveItem(items: string[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Photos are the whole reason someone recognises a house in the feed, so the grid
 * shows what it will look like: first tile is the cover, the rest follow, and a
 * file still going up sits in its own slot behind a progress bar instead of
 * leaving the host wondering whether the drop landed.
 */
export function PlacePhotoField({
  photos,
  placeName,
  onBusyChange,
}: {
  photos: PlacePhoto[];
  placeName: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState(() => photos.map((photo) => photo.url));
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<{ preview: string; label: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const busy = pending !== null;
  const atLimit = urls.length >= MAX_PLACE_PHOTOS;
  const photoAltPlace = placeName.trim() || "tu casa";

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  // A blob URL per in-flight file; revoked as soon as its upload resolves.
  useEffect(() => {
    const preview = pending?.preview;
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [pending?.preview]);

  async function handleFiles(fileList: FileList | null | undefined) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0 || busy) return;
    setError("");

    if (urls.length + files.length > MAX_PLACE_PHOTOS) {
      setError(`Entran hasta ${MAX_PLACE_PHOTOS} fotos — elegí menos.`);
      return;
    }

    try {
      let nextUrls = [...urls];
      for (let index = 0; index < files.length; index += 1) {
        setProgress(8);
        setPending({
          preview: URL.createObjectURL(files[index]),
          label: files.length === 1 ? "Subiendo" : `Subiendo ${index + 1}/${files.length}`,
        });
        const url = await uploadOptimizedImage({
          file: files[index],
          folder: "places",
          variant: "place",
          onProgress: setProgress,
        });
        if (!nextUrls.includes(url)) nextUrls = [...nextUrls, url];
        setUrls(nextUrls);
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "No pudimos subir esa foto. Probá con otra imagen."
      );
    } finally {
      setPending(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!atLimit) void handleFiles(event.dataTransfer.files);
  }

  const overlayButtonClass =
    "flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-scrim/70 text-on-scrim backdrop-blur-sm transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100";

  return (
    <div>
      {urls.map((url, index) => (
        <input key={`${url}-${index}`} type="hidden" name="photoUrls" value={url} />
      ))}

      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <p className="label mb-0">
          Fotos de la casa · {urls.length}/{MAX_PLACE_PHOTOS}
        </p>
        <span className="font-mono text-[11px] text-faded">
          {urls.length > 1 ? "las flechas reordenan" : "la primera es la portada"}
        </span>
      </div>

      <input
        ref={inputRef}
        id="place-photos"
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={busy || atLimit}
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          if (!atLimit) setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={handleDrop}
        className={`rounded-[20px] border border-dashed p-3 transition-colors ${
          dragging ? "border-clay bg-clay-tint" : "border-rule-strong bg-paper"
        }`}
      >
        {urls.length === 0 && !pending ? (
          <label
            htmlFor="place-photos"
            className="flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl text-center transition-colors hover:text-clay"
          >
            <span aria-hidden="true" className="text-2xl leading-none text-amenity-ink">
              +
            </span>
            <span className="text-sm font-semibold text-faded">
              Arrastrá varias juntas o tocá acá para elegirlas
            </span>
            <span className="font-mono text-[11px] text-faded">
              sin fotos tu casa aparece rayada en el feed
            </span>
          </label>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {urls.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-surface"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Foto ${index + 1} de ${photoAltPlace}`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-1">
                    <span className="rounded-full bg-scrim/70 px-2 py-1 font-mono text-[10px] font-semibold text-on-scrim backdrop-blur-sm">
                      {index === 0 ? "portada" : index + 1}
                    </span>
                    <button
                      type="button"
                      aria-label={`Borrar foto ${index + 1}`}
                      title="Borrar foto"
                      className={`${overlayButtonClass} text-base leading-none font-semibold`}
                      disabled={busy}
                      onClick={() => setUrls((current) => current.filter((_, i) => i !== index))}
                    >
                      ×
                    </button>
                  </div>
                  <div className="absolute inset-x-2 bottom-2 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                    <button
                      type="button"
                      aria-label={`Mover la foto ${index + 1} antes`}
                      title="Mover antes"
                      className={overlayButtonClass}
                      disabled={busy || index === 0}
                      onClick={() => setUrls((current) => moveItem(current, index, index - 1))}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      aria-label={`Mover la foto ${index + 1} después`}
                      title="Mover después"
                      className={overlayButtonClass}
                      disabled={busy || index === urls.length - 1}
                      onClick={() => setUrls((current) => moveItem(current, index, index + 1))}
                    >
                      →
                    </button>
                  </div>
                </div>
              ))}

              {pending && (
                <div className="relative flex aspect-[4/3] items-end overflow-hidden rounded-2xl border border-line bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pending.preview}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-45"
                  />
                  <div className="relative w-full p-2">
                    <div className="mb-1 flex justify-between font-mono text-[10px] text-ink">
                      <span>{pending.label}</span>
                      <span>{progress}%</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={pending.label}
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-1.5 overflow-hidden rounded-full bg-rule"
                    >
                      <div
                        className="h-full rounded-full bg-clay transition-[width]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {!atLimit && !pending && (
                <label
                  htmlFor="place-photos"
                  className={`flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl border border-dashed border-rule-strong text-faded transition-colors hover:border-clay hover:text-clay ${
                    busy ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  <span aria-hidden="true" className="text-xl leading-none">
                    +
                  </span>
                  <span className="text-xs font-semibold">sumar</span>
                </label>
              )}
            </div>

            <label
              htmlFor="place-photos"
              className={`mt-3 block cursor-pointer text-center text-sm font-semibold text-faded transition-colors hover:text-ink ${
                busy || atLimit ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {atLimit
                ? `Ya tenés las ${MAX_PLACE_PHOTOS} — borrá una para sumar otra`
                : "Arrastrá varias juntas o tocá acá para elegirlas"}
            </label>
          </>
        )}
      </div>

      {error && (
        <p aria-live="polite" className="mt-2 text-sm font-bold text-clay">
          {error}
        </p>
      )}
    </div>
  );
}
