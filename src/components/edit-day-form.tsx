"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { cancelDay, updateDay } from "@/lib/actions";

type EditableDay = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
};

type FormState = {
  status: "idle" | "success" | "error";
  message: string;
};

const initialState: FormState = {
  status: "idle",
  message: "",
};

const iconButtonBaseClass =
  "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border shadow-[0_8px_18px_-16px_rgba(60,40,20,0.7)] outline-none transition-[background-color,border-color,color,transform] focus-visible:ring-2 focus-visible:ring-clay/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-[0.96] disabled:cursor-default disabled:opacity-50 disabled:active:scale-100";
const inactiveIconButtonClass =
  "border-line bg-surface/95 text-faded hover:bg-amenity hover:text-ink";
const activeEditButtonClass = "border-ink bg-ink text-paper hover:bg-ink hover:text-paper";

function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? "Guardando..." : "Guardar cambios"}
    </button>
  );
}

function CancelButton() {
  const { pending } = useFormStatus();
  return (
    <button
      aria-label="Cancelar juntada"
      title="Cancelar juntada"
      className={`${iconButtonBaseClass} ${inactiveIconButtonClass} hover:bg-clay/10 hover:text-clay`}
      disabled={pending}
    >
      <XIcon />
    </button>
  );
}

function Feedback({ status, message }: { status: "idle" | "success" | "error"; message: string }) {
  if (!message) return null;
  const success = status === "success";
  return (
    <p
      aria-live="polite"
      className={`text-sm font-bold ${success ? "text-olive" : "text-clay"}`}
    >
      {message}
    </p>
  );
}

export function DayOwnerControls({
  day,
  minDate,
  className = "contents",
  actionsClassName = "absolute top-3 right-3 flex gap-1.5",
  formClassName = "mt-3 border-t border-line pt-3",
  successClassName = "mt-3 rounded-xl bg-olive/10 px-3 py-2 text-sm font-bold text-olive",
}: {
  day: EditableDay;
  minDate: string;
  className?: string;
  actionsClassName?: string;
  formClassName?: string;
  successClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [state, setState] = useState<FormState>(initialState);
  const dateId = `edit-day-${day.id}-date`;
  const startId = `edit-day-${day.id}-start`;
  const endId = `edit-day-${day.id}-end`;
  const descriptionId = `edit-day-${day.id}-description`;

  async function handleUpdateDay(formData: FormData) {
    setShowSuccess(false);
    const result = await updateDay(initialState, formData);
    setState(result);
    if (result.status !== "success") return;
    setEditing(false);
    setShowSuccess(true);
  }

  return (
    <div className={className}>
      <div className={actionsClassName}>
        <button
          type="button"
          aria-label={editing ? "Cerrar edición" : "Editar juntada"}
          aria-expanded={editing}
          aria-pressed={editing}
          title={editing ? "Cerrar edición" : "Editar juntada"}
          className={`${iconButtonBaseClass} ${
            editing ? activeEditButtonClass : inactiveIconButtonClass
          }`}
          onClick={() => {
            setShowSuccess(false);
            setEditing((open) => !open);
          }}
        >
          <PencilIcon />
        </button>
        <form action={cancelDay}>
          <input type="hidden" name="dayId" value={day.id} />
          <CancelButton />
        </form>
      </div>

      {showSuccess && state.status === "success" && state.message && (
        <p aria-live="polite" className={successClassName}>
          {state.message}
        </p>
      )}

      {editing && (
        <form
          action={handleUpdateDay}
          className={`${formClassName} space-y-3`}
        >
          <input type="hidden" name="dayId" value={day.id} />
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label htmlFor={dateId} className="label">
                Fecha
              </label>
              <input
                id={dateId}
                name="date"
                type="date"
                min={minDate}
                defaultValue={day.date}
                required
                className="input"
              />
            </div>
            <div>
              <label htmlFor={startId} className="label">
                Desde
              </label>
              <input
                id={startId}
                name="startTime"
                type="time"
                defaultValue={day.startTime}
                required
                className="input"
              />
            </div>
            <div>
              <label htmlFor={endId} className="label">
                Hasta
              </label>
              <input
                id={endId}
                name="endTime"
                type="time"
                defaultValue={day.endTime}
                required
                className="input"
              />
            </div>
          </div>

          <div>
            <label htmlFor={descriptionId} className="label">
              Mood
            </label>
            <textarea
              id={descriptionId}
              name="description"
              maxLength={280}
              rows={3}
              defaultValue={day.description}
              placeholder="Foco tranquilo, mate compartido, calls cortas en el balcón..."
              className="input min-h-24 resize-y leading-relaxed"
            />
          </div>

          <div className="rounded-xl bg-amenity px-3 py-2 text-[13px] leading-relaxed text-amenity-ink">
            Si cambiás fecha u horario, avisamos por mail a quienes ya vienen.
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {state.status === "error" && <Feedback status={state.status} message={state.message} />}
            <SaveButton />
          </div>
        </form>
      )}
    </div>
  );
}
