"use client";

import { useRef, useState, type DragEvent } from "react";
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

export function PlacePhotoGalleryField({
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
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState("");
  const [error, setError] = useState("");
  const busy = uploading;
  const atLimit = urls.length >= MAX_PLACE_PHOTOS;
  const photoAltPlace = placeName.trim() || "tu casa";

  async function handleFiles(fileList: FileList | null | undefined) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0 || busy) return;
    setError("");

    if (urls.length + files.length > MAX_PLACE_PHOTOS) {
      setError(`Subí hasta ${MAX_PLACE_PHOTOS} fotos.`);
      return;
    }

    setUploading(true);
    onBusyChange?.(true);
    setProgress(8);

    try {
      let nextUrls = [...urls];
      for (let index = 0; index < files.length; index += 1) {
        setUploadLabel(files.length === 1 ? "Subiendo foto" : `Subiendo ${index + 1}/${files.length}`);
        const url = await uploadOptimizedImage({
          file: files[index],
          folder: "places",
          variant: "place",
          onProgress: setProgress,
        });
        if (!nextUrls.includes(url)) nextUrls = [...nextUrls, url];
        setUrls(nextUrls);
      }
      setProgress(100);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "No pudimos subir esa foto. Probá con otra imagen."
      );
    } finally {
      setUploading(false);
      onBusyChange?.(false);
      setUploadLabel("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!atLimit) void handleFiles(event.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      {urls.map((url, index) => (
        <input key={`${url}-${index}`} type="hidden" name="photoUrls" value={url} />
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Fotos de la casa · {urls.length}/{MAX_PLACE_PHOTOS}</p>
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
      </div>

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
        className={`rounded-2xl border border-dashed p-3 transition-colors ${
          dragging ? "border-clay bg-[oklch(0.96_0.03_45)]" : "border-line bg-paper"
        }`}
      >
        {urls.length === 0 ? (
          <label
            htmlFor="place-photos"
            className={`flex min-h-[160px] cursor-pointer items-center justify-center rounded-xl text-center text-sm font-semibold text-faded ${
              busy || atLimit ? "pointer-events-none opacity-60" : ""
            }`}
          >
            Arrastrá fotos o tocá acá para elegir
          </label>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                  <div className="absolute inset-x-2 top-2 flex justify-between gap-1">
                    <span className="rounded-full bg-ink/70 px-2 py-1 font-mono text-[10px] font-semibold text-white backdrop-blur-sm">
                      {index === 0 ? "portada" : index + 1}
                    </span>
                    <button
                      type="button"
                      aria-label="Borrar foto"
                      title="Borrar foto"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-lg leading-none font-semibold text-white backdrop-blur-sm transition-transform active:scale-95"
                      disabled={busy}
                      onClick={() => setUrls((current) => current.filter((_, i) => i !== index))}
                    >
                      ×
                    </button>
                  </div>
                  <div className="absolute inset-x-2 bottom-2 flex gap-1">
                    <button
                      type="button"
                      aria-label="Mover foto antes"
                      title="Mover antes"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-paper/90 font-semibold text-ink shadow-sm transition-transform active:scale-95 disabled:opacity-40"
                      disabled={busy || index === 0}
                      onClick={() => setUrls((current) => moveItem(current, index, index - 1))}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      aria-label="Mover foto después"
                      title="Mover después"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-paper/90 font-semibold text-ink shadow-sm transition-transform active:scale-95 disabled:opacity-40"
                      disabled={busy || index === urls.length - 1}
                      onClick={() => setUrls((current) => moveItem(current, index, index + 1))}
                    >
                      →
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <label
              htmlFor="place-photos"
              className={`mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-line bg-surface/60 px-3 py-2.5 text-center text-sm font-semibold text-faded transition-colors hover:bg-amenity ${
                busy || atLimit ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {atLimit ? `Máximo ${MAX_PLACE_PHOTOS} fotos` : "Arrastrá más fotos o tocá acá para sumar"}
            </label>
          </>
        )}

        {uploading && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between font-mono text-[11px] text-faded">
              <span>{uploadLabel}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-clay transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex min-h-5 items-center">
        <p aria-live="polite" className="text-sm font-bold text-clay">
          {error}
        </p>
      </div>
    </div>
  );
}
