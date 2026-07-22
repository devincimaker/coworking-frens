"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { Avatar } from "@/components/avatar";

type UploadFolder = "avatars" | "places";
type ImageUploadVariant = "avatar" | "place";

type ImageUploadFieldProps = {
  id: string;
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  previewName: string;
  folder?: UploadFolder;
  required?: boolean;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
};

const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const AVATAR_OUTPUT_SIZE = 720;
const PLACE_MAX_EDGE = 1600;
const TARGET_BYTES = 1.6 * 1024 * 1024;
const ALLOWED_OUTPUT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionFor(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  return "webp";
}

function safeFileStem(name: string) {
  const stem = name.replace(/\.[^.]+$/, "").toLowerCase();
  const safe = stem.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 42);
  return safe || "image";
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No pudimos leer esa imagen."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

function avatarCanvasSize(image: HTMLImageElement) {
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  if (!sourceSize) throw new Error("No pudimos leer esa imagen.");

  const size = Math.min(AVATAR_OUTPUT_SIZE, sourceSize);
  return {
    width: size,
    height: size,
    sx: Math.floor((image.naturalWidth - sourceSize) / 2),
    sy: Math.floor((image.naturalHeight - sourceSize) / 2),
    sw: sourceSize,
    sh: sourceSize,
  };
}

function placeCanvasSize(image: HTMLImageElement) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!width || !height) throw new Error("No pudimos leer esa imagen.");

  const scale = Math.min(1, PLACE_MAX_EDGE / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    sx: 0,
    sy: 0,
    sw: width,
    sh: height,
  };
}

async function optimizeImage(file: File, variant: ImageUploadVariant) {
  const image = await loadImage(file);
  const size = variant === "avatar" ? avatarCanvasSize(image) : placeCanvasSize(image);

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No pudimos preparar la imagen.");

  ctx.drawImage(image, size.sx, size.sy, size.sw, size.sh, 0, 0, size.width, size.height);

  let fallback: Blob | null = null;
  for (const type of ["image/webp", "image/jpeg"]) {
    for (const quality of [0.86, 0.74, 0.62]) {
      const blob = await canvasToBlob(canvas, type, quality);
      if (!blob) continue;
      fallback = blob;
      if (blob.size <= TARGET_BYTES) {
        return new File([blob], `${safeFileStem(file.name)}.${extensionFor(blob.type)}`, {
          type: blob.type,
        });
      }
    }
  }

  if (!fallback) throw new Error("No pudimos preparar la imagen.");
  return new File([fallback], `${safeFileStem(file.name)}.${extensionFor(fallback.type)}`, {
    type: fallback.type,
  });
}

export async function uploadOptimizedImage({
  file,
  folder = "avatars",
  variant = "avatar",
  onProgress,
}: {
  file: File;
  folder?: UploadFolder;
  variant?: ImageUploadVariant;
  onProgress?: (progress: number) => void;
}) {
  if (!file.type.startsWith("image/")) throw new Error("Elegí una imagen.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("Usá una imagen de menos de 12 MB.");

  onProgress?.(8);
  const optimized = await optimizeImage(file, variant);
  if (!ALLOWED_OUTPUT_TYPES.has(optimized.type)) throw new Error("Formato de imagen inválido.");

  const blob = await upload(
    `${folder}/${safeFileStem(file.name)}.${extensionFor(optimized.type)}`,
    optimized,
    {
      access: "public",
      contentType: optimized.type,
      handleUploadUrl: "/api/blob/upload",
      clientPayload: JSON.stringify({ folder }),
      onUploadProgress: ({ percentage }) => onProgress?.(Math.max(8, Math.round(percentage))),
    }
  );

  return blob.url;
}

export function ImageUploadField({
  id,
  name = "image",
  label,
  value,
  onChange,
  previewName,
  folder = "avatars",
  required = false,
  disabled = false,
  onBusyChange,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const helperId = `${id}-helper`;
  const previewImage = value.trim() || null;

  async function handleFile(file: File | undefined) {
    if (!file || disabled || uploading) return;
    setError("");

    setUploading(true);
    setProgress(8);
    onBusyChange?.(true);

    try {
      const url = await uploadOptimizedImage({
        file,
        folder,
        variant: "avatar",
        onProgress: setProgress,
      });
      onChange(url);
      setProgress(100);
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "No pudimos subir la foto. Probá con otra imagen.";
      setError(message);
    } finally {
      setUploading(false);
      onBusyChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      <div className="label">{label}</div>
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFile(event.dataTransfer.files[0]);
        }}
        className={`rounded-2xl border p-3 transition-colors ${
          dragging ? "border-clay bg-[oklch(0.96_0.03_45)]" : "border-line bg-paper"
        }`}
      >
        <div className="flex items-center gap-3">
          <label
            htmlFor={id}
            aria-describedby={helperId}
            className={`flex min-w-0 flex-1 cursor-pointer items-center gap-3 ${
              disabled || uploading ? "pointer-events-none opacity-70" : ""
            }`}
          >
            <Avatar name={previewName} image={previewImage} size={66} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">
                {previewImage ? "Cambiar foto" : "Subir foto"}
              </span>
              <span id={helperId} className="mt-0.5 block text-xs text-faded">
                {uploading ? `Subiendo ${progress}%` : "Arrastrá una imagen o tocá para elegir"}
              </span>
            </span>
          </label>

          {previewImage && !required && (
            <button
              type="button"
              className="btn-ghost shrink-0 px-3"
              onClick={() => {
                onChange("");
                setError("");
              }}
              disabled={disabled || uploading}
            >
              Borrar
            </button>
          )}
        </div>

        {uploading && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-clay transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-1.5 text-sm font-semibold text-clay">
          {error}
        </p>
      )}
    </div>
  );
}
