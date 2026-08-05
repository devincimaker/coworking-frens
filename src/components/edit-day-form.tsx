"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { cancelDay, updateDay } from "@/lib/actions";
import { CancelReasonField } from "@/components/cancel-reason-field";

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
  "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border shadow-step outline-none transition-[background-color,border-color,color,transform] focus-visible:ring-2 focus-visible:ring-clay/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-[0.96] disabled:cursor-default disabled:opacity-50 disabled:active:scale-100";
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

function PendingButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? pendingLabel : label}
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
  const [panel, setPanel] = useState<"none" | "edit" | "cancel">("none");
  const [showSuccess, setShowSuccess] = useState(false);
  const [state, setState] = useState<FormState>(initialState);
  const dateId = `edit-day-${day.id}-date`;
  const startId = `edit-day-${day.id}-start`;
  const endId = `edit-day-${day.id}-end`;
  const descriptionId = `edit-day-${day.id}-description`;
  const cancelReasonId = `edit-day-${day.id}-cancel-reason`;

  async function handleUpdateDay(formData: FormData) {
    setShowSuccess(false);
    const result = await updateDay(initialState, formData);
    setState(result);
    if (result.status !== "success") return;
    setPanel("none");
    setShowSuccess(true);
  }

  function togglePanel(target: "edit" | "cancel") {
    setShowSuccess(false);
    setPanel((open) => (open === target ? "none" : target));
  }

  const editing = panel === "edit";
  const confirmingCancel = panel === "cancel";

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
          onClick={() => togglePanel("edit")}
        >
          <PencilIcon />
        </button>
        <button
          type="button"
          aria-label={confirmingCancel ? "Cerrar cancelación" : "Cancelar juntada"}
          aria-expanded={confirmingCancel}
          aria-pressed={confirmingCancel}
          title={confirmingCancel ? "Cerrar cancelación" : "Cancelar juntada"}
          className={`${iconButtonBaseClass} ${
            confirmingCancel
              ? activeEditButtonClass
              : `${inactiveIconButtonClass} hover:bg-clay/10 hover:text-clay`
          }`}
          onClick={() => togglePanel("cancel")}
        >
          <XIcon />
        </button>
      </div>

      {showSuccess && state.status === "success" && state.message && (
        <p aria-live="polite" className={successClassName}>
          {state.message}
        </p>
      )}

      {confirmingCancel && (
        <form
          action={cancelDay}
          className="mt-3 basis-full rounded-2xl border border-coral-200 bg-coral-100/60 px-4 py-3.5"
        >
          <input type="hidden" name="dayId" value={day.id} />
          <p className="text-sm leading-relaxed text-ink">
            ¿Cancelás esta juntada? Le avisamos por mail a quienes ya venían. Si querés, contales
            por qué — no hace falta.
          </p>
          <CancelReasonField id={cancelReasonId} name="cancellationReason" />
          <div className="mt-3 flex gap-2.5">
            <button type="button" className="btn-ghost" onClick={() => setPanel("none")}>
              Dejarlo abierto
            </button>
            <PendingButton label="Sí, cancelar" pendingLabel="Cancelando…" />
          </div>
        </form>
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
            <PendingButton label="Guardar cambios" pendingLabel="Guardando..." />
          </div>
        </form>
      )}
    </div>
  );
}
