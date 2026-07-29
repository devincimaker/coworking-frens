"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { cancelDay, removeAttendee, updateDay } from "@/lib/actions";
import { formatDay } from "@/lib/tz";
import { userProfilePath } from "@/lib/profile";
import { Avatar, AvatarStack } from "@/components/avatar";
import { SpotsChip } from "@/components/day-card";
import { NumberStepper } from "@/components/host/number-stepper";
import { PencilIcon, XIcon } from "@/components/host/icons";
import type { HostDayData, HostFormState } from "@/components/host/types";

const initialState: HostFormState = {
  status: "idle",
  message: "",
};

const firstName = (name: string | null) => name?.trim().split(" ")[0] ?? "Alguien";

/** "Lea", "Ana y Marco", "Ana, Marco y Lea", "Ana, Marco, Lea y 2 más". */
function nameList(names: string[], max = 3) {
  if (names.length <= max) {
    if (names.length <= 1) return names[0] ?? "";
    return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
  }
  const extra = names.length - max;
  return `${names.slice(0, max).join(", ")} y ${extra} más`;
}

function AttendeeNameList({ day }: { day: HostDayData }) {
  const shown = day.attendees.slice(0, 3);
  const extra = day.attendees.length - shown.length;

  return (
    <>
      {shown.map((person, index) => {
        const separator = index === 0 ? "" : index === shown.length - 1 && extra === 0 ? " y " : ", ";
        return (
          <span key={person.id}>
            {separator}
            <Link
              href={userProfilePath(person.id)}
              className="profile-link rounded-sm outline-none hover:text-clay focus-visible:ring-2 focus-visible:ring-clay/60"
            >
              <span data-profile-label>{firstName(person.name)}</span>
            </Link>
          </span>
        );
      })}
      {extra > 0 && (
        <>
          {" y "}
          <Link
            href={`/day/${day.id}`}
            className="rounded-sm font-semibold underline-offset-[0.2em] outline-none hover:text-clay hover:underline focus-visible:ring-2 focus-visible:ring-clay/60"
          >
            {extra} más
          </Link>
        </>
      )}
    </>
  );
}

const roundButtonClass =
  "flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors active:scale-[0.96] disabled:cursor-default disabled:opacity-50 disabled:active:scale-100";
const quietButtonClass = "border-line bg-surface text-faded hover:bg-amenity hover:text-ink";

function DateColumn({ day }: { day: HostDayData }) {
  return (
    <div className="w-24 shrink-0">
      <div className="font-display text-[17px] leading-tight font-bold text-ink">
        {formatDay(day.date)}
      </div>
      <div className="font-mono text-xs text-faded">
        {day.startTime}–{day.endTime}
      </div>
    </div>
  );
}

export function OpenDayRow({
  day,
  minDate,
  onEditingChange,
}: {
  day: HostDayData;
  minDate: string;
  onEditingChange?: (dayId: string, editing: boolean) => void;
}) {
  const [mode, setModeState] = useState<"row" | "edit" | "confirm-cancel">("row");
  const [capacity, setCapacity] = useState(day.capacity);
  const [busy, startTransition] = useTransition();
  const [actionError, setActionError] = useState("");
  const [saved, setSaved] = useState("");

  const taken = day.attendees.length;
  const names = day.attendees.map((person) => firstName(person.name));
  const audience = day.circleName ? `“${day.circleName}”` : "todos mis amigos";

  // The composer above folds away while the editor is open — one editor at a
  // time. Confirming a cancel is a two-second detour and leaves it alone.
  function setMode(next: typeof mode) {
    setModeState(next);
    onEditingChange?.(day.id, next === "edit");
  }

  // A row can vanish under an open editor — the day gets cancelled, or its date
  // moves it elsewhere in the list. Release the fold either way.
  useEffect(() => () => onEditingChange?.(day.id, false), [day.id, onEditingChange]);

  const [state, formAction, pending] = useActionState(
    async (previous: HostFormState, formData: FormData) => {
      const result = await updateDay(previous, formData);
      if (result.status === "success") {
        setMode("row");
        setSaved(result.message);
        window.setTimeout(() => setSaved(""), 6000);
      }
      return result;
    },
    initialState
  );

  // Server actions that take a bare FormData, called from a button rather than a
  // nested <form> — the edit card is already one form and forms don't nest.
  function run(action: (data: FormData) => Promise<void>, entries: Record<string, string>) {
    const data = new FormData();
    for (const [key, value] of Object.entries(entries)) data.append(key, value);
    setActionError("");
    startTransition(async () => {
      try {
        await action(data);
      } catch {
        setActionError("No pudimos hacer eso. Probá de nuevo.");
      }
    });
  }

  if (mode === "confirm-cancel") {
    return (
      <div className="rounded-2xl border border-coral-200 bg-coral-100/60 px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <DateColumn day={day} />
          <p className="min-w-[14rem] flex-1 text-sm leading-relaxed text-ink">
            {taken === 0 ? (
              "¿Cancelás este día? Todavía no se anotó nadie."
            ) : (
              <>
                ¿Cancelás este día? Le avisamos por mail a{" "}
                <strong className="font-semibold">{nameList(names)}</strong>. No tenés que explicar
                nada.
              </>
            )}
          </p>
          <div className="flex gap-2.5">
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => setMode("row")}>
              Dejarlo abierto
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => run(cancelDay, { dayId: day.id })}
            >
              {busy ? "Cancelando…" : "Sí, cancelar"}
            </button>
          </div>
        </div>
        {actionError && (
          <p aria-live="polite" className="mt-2 text-sm font-bold text-clay">
            {actionError}
          </p>
        )}
      </div>
    );
  }

  if (mode === "edit") {
    return (
      <form action={formAction} className="card border-coral-200 shadow-card p-4 sm:p-[18px]">
        <input type="hidden" name="dayId" value={day.id} />

        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="font-display text-xl font-bold text-ink">
            Editar el día de {formatDay(day.date).toLowerCase()}
          </h3>
          <button
            type="button"
            aria-label="Cerrar edición"
            title="Cerrar edición"
            className={`${roundButtonClass} border-ink bg-ink text-paper`}
            onClick={() => setMode("row")}
          >
            <XIcon />
          </button>
        </div>

        <div className="mb-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <label htmlFor={`day-${day.id}-date`} className="label">
              Fecha
            </label>
            <input
              id={`day-${day.id}-date`}
              name="date"
              type="date"
              min={minDate}
              defaultValue={day.date}
              required
              className="input"
            />
          </div>
          <div>
            <label htmlFor={`day-${day.id}-start`} className="label">
              Desde
            </label>
            <input
              id={`day-${day.id}-start`}
              name="startTime"
              type="time"
              defaultValue={day.startTime}
              required
              className="input"
            />
          </div>
          <div>
            <label htmlFor={`day-${day.id}-end`} className="label">
              Hasta
            </label>
            <input
              id={`day-${day.id}-end`}
              name="endTime"
              type="time"
              defaultValue={day.endTime}
              required
              className="input"
            />
          </div>
          <div>
            <p className="label">Sillas · solo este día</p>
            <NumberStepper
              name="capacity"
              value={capacity}
              onChange={setCapacity}
              min={Math.max(1, taken)}
              minReason={
                taken > 0
                  ? `mínimo ${taken} — ${taken === 1 ? "ya se sumó una persona" : `ya se sumaron ${taken}`}`
                  : undefined
              }
            />
          </div>
        </div>

        {taken > 0 && (
          <div className="mb-3 rounded-2xl bg-amenity p-3.5">
            <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="eyebrow">
                Quiénes van · {taken} de {capacity}
              </p>
              <p className="text-[13px] text-amenity-ink">
                Para bajar las sillas, sacá a alguien — o cancelá el día y abrí otro.
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {day.attendees.map((person) => (
                <li
                  key={person.id}
                  className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl bg-surface px-3 py-2"
                >
                  <Avatar name={person.name} image={person.image} size={28} />
                  <Link
                    href={userProfilePath(person.id)}
                    className="profile-link min-w-0 flex-1 truncate rounded-sm text-sm text-ink outline-none hover:text-clay focus-visible:ring-2 focus-visible:ring-clay/60"
                  >
                    <span data-profile-label>{person.name ?? "Alguien"}</span>
                  </Link>
                  {person.joinedLabel && (
                    <span className="font-mono text-[11px] text-faded">{person.joinedLabel}</span>
                  )}
                  <button
                    type="button"
                    className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-[13px] font-semibold text-faded transition-colors hover:border-clay/40 hover:text-clay disabled:opacity-50"
                    disabled={busy}
                    onClick={() =>
                      run(removeAttendee, { dayId: day.id, userId: person.id })
                    }
                  >
                    Sacar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-3">
          <label htmlFor={`day-${day.id}-mood`} className="label">
            Mood
          </label>
          <textarea
            id={`day-${day.id}-mood`}
            name="description"
            rows={3}
            maxLength={280}
            defaultValue={day.description}
            placeholder="Foco tranquilo hasta el almuerzo, después mate y calls cortas en el balcón…"
            className="input min-h-24 resize-y leading-relaxed"
          />
        </div>

        <p className="mb-3.5 rounded-xl bg-amenity px-3.5 py-2.5 text-[13px] leading-relaxed text-amenity-ink">
          {taken > 0
            ? `Si cambiás fecha u horario, avisamos por mail a ${nameList(names)}.`
            : "Todavía no hay nadie anotado, así que no le avisamos a nadie."}
        </p>

        {(state.status === "error" || actionError) && (
          <p aria-live="polite" className="mb-3 text-sm font-bold text-clay">
            {actionError || state.message}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="cursor-pointer text-sm font-semibold text-faded transition-colors hover:text-clay"
            onClick={() => setMode("confirm-cancel")}
          >
            Cancelar la juntada
          </button>
          <div className="flex gap-2.5">
            <button type="button" className="btn-ghost" onClick={() => setMode("row")}>
              Descartar
            </button>
            <button className="btn-primary" disabled={pending}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="panel flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3.5">
        <DateColumn day={day} />
        <div className="flex min-w-[12rem] flex-1 flex-wrap items-center gap-2.5">
          {taken > 0 && <AvatarStack users={day.attendees} size={26} />}
          <span className={`text-sm ${taken > 0 ? "text-ink" : "text-faded"}`}>
            {taken === 0 ? (
              "Nadie todavía"
            ) : (
              <>
                <AttendeeNameList day={day} /> {taken === 1 ? "viene" : "vienen"}
              </>
            )}
          </span>
          <SpotsChip taken={taken} capacity={day.capacity} tone="neutral" />
        </div>
        <span className="font-mono text-[11px] text-faded">{audience}</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label={`Editar el día de ${formatDay(day.date).toLowerCase()}`}
            title="Editar"
            className={`${roundButtonClass} ${quietButtonClass}`}
            onClick={() => setMode("edit")}
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            aria-label={`Cancelar el día de ${formatDay(day.date).toLowerCase()}`}
            title="Cancelar"
            className={`${roundButtonClass} ${quietButtonClass} hover:bg-clay/10 hover:text-clay`}
            onClick={() => setMode("confirm-cancel")}
          >
            <XIcon />
          </button>
        </div>
      </div>

      {saved && (
        <p aria-live="polite" className="mt-1.5 px-1 text-[13px] font-semibold text-olive">
          {saved}
        </p>
      )}
      {taken >= day.capacity && (
        <p className="mt-1.5 px-1 text-[13px] leading-relaxed text-faded">
          Completo. Sumá una silla desde el lápiz si entra alguien más — o dejalo así.
        </p>
      )}
    </div>
  );
}
