"use client";

import { useRef, useState, type DragEvent } from "react";
import { uploadOptimizedImage } from "@/components/image-upload-field";

export function FeedbackImageField({
  value,
  onChange,
  disabled = false,
  onBusyChange,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file || disabled || uploading) return;

    setError("");
    setUploading(true);
    setProgress(8);
    onBusyChange?.(true);

    try {
      const url = await uploadOptimizedImage({
        file,
        folder: "feedback",
        variant: "place",
        onProgress: setProgress,
      });
      onChange(url);
      setProgress(100);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "No pudimos subir esa imagen. Probá con otra."
      );
    } finally {
      setUploading(false);
      onBusyChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files[0]);
  }

  return (
    <div>
      <div className="label">Captura opcional</div>
      <input
        ref={inputRef}
        id="feedback-image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-line bg-paper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Captura adjunta al feedback"
            className="h-28 w-full object-cover"
          />
          <div className="absolute inset-x-2 top-2 flex justify-end">
            <button
              type="button"
              title="Quitar imagen"
              aria-label="Quitar imagen"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-ink/80 text-lg leading-none text-white backdrop-blur-sm transition-transform active:scale-95 disabled:opacity-50"
              disabled={disabled || uploading}
              onClick={() => {
                onChange("");
                setError("");
              }}
            >
              ×
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            if (!disabled && !uploading) setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragging(false);
          }}
          onDrop={handleDrop}
          className={`rounded-xl border border-dashed px-3 transition-colors ${
            dragging ? "border-clay bg-clay-tint" : "border-line bg-paper"
          }`}
        >
          <label
            htmlFor="feedback-image"
            className={`flex min-h-16 cursor-pointer items-center gap-3 ${
              disabled || uploading ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amenity text-amenity-ink"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="8.5" cy="9" r="1.5" />
                <path d="m21 15-5-5L5 20" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">
                {uploading ? `Subiendo ${progress}%` : "Soltá una imagen o elegila"}
              </span>
              <span className="block text-xs text-faded">JPG, PNG o WebP · hasta 12 MB</span>
            </span>
          </label>
          {uploading && (
            <div className="mb-2 h-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-clay transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-1.5 text-sm font-semibold text-clay">
          {error}
        </p>
      )}
    </div>
  );
}
