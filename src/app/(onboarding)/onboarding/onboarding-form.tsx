"use client";

import { useActionState, useState } from "react";
import { ImageUploadField } from "@/components/image-upload-field";
import { completeOnboarding } from "@/lib/actions";

const initialState = {
  status: "idle" as const,
  message: "",
};

export function OnboardingForm({
  user,
  callbackUrl,
}: {
  user: {
    name: string | null;
    username: string;
    email: string;
    image: string | null;
    bio: string;
  };
  callbackUrl: string;
}) {
  const [name, setName] = useState(user.name ?? "");
  const [username, setUsername] = useState(user.username);
  const [image, setImage] = useState(user.image ?? "");
  const [imageBusy, setImageBusy] = useState(false);
  const [bio, setBio] = useState(user.bio ?? "");
  const [state, formAction, pending] = useActionState(completeOnboarding, initialState);
  const previewName = name.trim() || username || user.email.split("@")[0];
  const previewImage = image.trim() || null;
  const statusClass = state.status === "error" ? "text-clay" : "text-olive";
  const submitDisabled = pending || imageBusy || !previewImage;

  return (
    <form action={formAction} className="card overflow-hidden p-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          Armá tu perfil
        </h1>
        <p className="mt-1 truncate text-sm text-faded">{user.email}</p>
      </div>

      <div className="space-y-3">
        <ImageUploadField
          id="onboarding-image"
          label="Foto"
          value={image}
          onChange={setImage}
          previewName={previewName}
          required
          disabled={pending}
          onBusyChange={setImageBusy}
        />

        <div>
          <label htmlFor="onboarding-name" className="label">
            Nombre
          </label>
          <input
            id="onboarding-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
            className="input"
          />
        </div>

        <div>
          <label htmlFor="onboarding-username" className="label">
            Username
          </label>
          <div className="flex rounded-xl border border-line bg-paper focus-within:border-clay">
            <span className="flex items-center pl-3 font-mono text-sm text-faded">@</span>
            <input
              id="onboarding-username"
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

        <div>
          <label htmlFor="onboarding-bio" className="label">
            Bio
          </label>
          <textarea
            id="onboarding-bio"
            name="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={160}
            rows={3}
            required
            placeholder="Trabajo mejor con mate, foco y una mesa cerca de la ventana."
            className="input resize-none"
          />
          <div className="mt-1 text-right font-mono text-[11px] text-faded">{bio.length}/160</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className={`min-h-5 text-sm font-bold ${statusClass}`}>
          {state.message}
        </p>
        <button type="submit" className="btn-primary" disabled={submitDisabled}>
          {imageBusy ? "Subiendo foto..." : pending ? "Guardando..." : "Entrar"}
        </button>
      </div>
    </form>
  );
}
