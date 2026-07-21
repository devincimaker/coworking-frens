"use client";

import { useActionState, useState } from "react";
import { Avatar } from "@/components/avatar";
import { updateProfile } from "@/lib/actions";

const initialState = {
  status: "idle" as const,
  message: "",
};

export function ProfileForm({
  user,
}: {
  user: { name: string | null; email: string; image: string | null };
}) {
  const [name, setName] = useState(user.name ?? "");
  const [image, setImage] = useState(user.image ?? "");
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const previewName = name.trim() || user.email.split("@")[0];
  const previewImage = image.trim() || null;
  const statusClass = state.status === "error" ? "text-clay" : "text-olive";

  return (
    <form action={formAction} className="card space-y-5 p-5">
      <div className="flex items-center gap-4">
        <Avatar name={previewName} image={previewImage} size={72} />
        <div className="min-w-0">
          <p className="truncate font-display text-2xl font-semibold leading-tight">
            {previewName}
          </p>
          <p className="truncate text-sm text-faded">{user.email}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="profile-name" className="label">
            Nombre
          </label>
          <input
            id="profile-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
            className="input"
          />
        </div>

        <div>
          <label htmlFor="profile-image" className="label">
            URL de tu foto
          </label>
          <div className="flex gap-2">
            <input
              id="profile-image"
              name="image"
              type="url"
              value={image}
              onChange={(event) => setImage(event.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="input"
            />
            <button
              type="button"
              className="btn-ghost shrink-0"
              onClick={() => setImage("")}
              disabled={!image || pending}
            >
              Borrar
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className={`min-h-5 text-sm font-bold ${statusClass}`}>
          {state.message}
        </p>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Guardando..." : "Guardar perfil"}
        </button>
      </div>
    </form>
  );
}
