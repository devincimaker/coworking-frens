"use client";

import { useActionState, useState } from "react";
import { Avatar } from "@/components/avatar";
import { ImageUploadField } from "@/components/image-upload-field";
import { updateProfile } from "@/lib/actions";

const initialState = {
  status: "idle" as const,
  message: "",
};

export function ProfileForm({
  user,
}: {
  user: {
    name: string | null;
    username: string | null;
    email: string;
    image: string | null;
    bio: string;
  };
}) {
  const [name, setName] = useState(user.name ?? "");
  const [username, setUsername] = useState(user.username ?? "");
  const [image, setImage] = useState(user.image ?? "");
  const [imageBusy, setImageBusy] = useState(false);
  const [bio, setBio] = useState(user.bio ?? "");
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const previewName = name.trim() || username || user.email.split("@")[0];
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
          <p className="truncate font-mono text-xs text-faded">@{username || "username"}</p>
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
          <label htmlFor="profile-username" className="label">
            Username
          </label>
          <div className="flex rounded-xl border border-line bg-paper focus-within:border-clay">
            <span className="flex items-center pl-3 font-mono text-sm text-faded">@</span>
            <input
              id="profile-username"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase())}
              minLength={3}
              maxLength={24}
              pattern="[a-z0-9_]+"
              required
              className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm text-ink outline-none"
            />
          </div>
        </div>

        <ImageUploadField
          id="profile-image"
          label="Foto"
          value={image}
          onChange={setImage}
          previewName={previewName}
          disabled={pending}
          onBusyChange={setImageBusy}
        />

        <div>
          <label htmlFor="profile-bio" className="label">
            Bio
          </label>
          <textarea
            id="profile-bio"
            name="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={160}
            rows={3}
            required
            className="input resize-none"
          />
          <div className="mt-1 text-right font-mono text-[11px] text-faded">{bio.length}/160</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className={`min-h-5 text-sm font-bold ${statusClass}`}>
          {state.message}
        </p>
        <button type="submit" className="btn-primary" disabled={pending || imageBusy}>
          {imageBusy ? "Subiendo foto..." : pending ? "Guardando..." : "Guardar perfil"}
        </button>
      </div>
    </form>
  );
}
