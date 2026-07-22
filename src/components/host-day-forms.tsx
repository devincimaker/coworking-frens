"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createOneOffDay, createRule } from "@/lib/actions";
import { WEEKDAY_LABELS } from "@/lib/tz";

type Circle = {
  id: string;
  name: string;
};

const initialState = {
  status: "idle" as const,
  message: "",
};

function CircleSelect({
  circles,
  defaultValue,
}: {
  circles: Circle[];
  defaultValue?: string;
}) {
  return (
    <select name="circleId" defaultValue={defaultValue ?? ""} className="input">
      <option value="">Todos mis amigos</option>
      {circles.map((c) => (
        <option key={c.id} value={c.id}>
          Solo “{c.name}”
        </option>
      ))}
    </select>
  );
}

function TimeCapacityFields({ defaultCapacity }: { defaultCapacity: number }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div>
        <label className="label">Desde</label>
        <input name="startTime" type="time" defaultValue="09:00" required className="input" />
      </div>
      <div>
        <label className="label">Hasta</label>
        <input name="endTime" type="time" defaultValue="17:00" required className="input" />
      </div>
      <div>
        <label className="label">Lugares</label>
        <input
          name="capacity"
          type="number"
          min={1}
          max={20}
          defaultValue={defaultCapacity}
          className="input"
        />
      </div>
    </div>
  );
}

function SubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary" disabled={pending}>
      {pending ? "Abriendo..." : children}
    </button>
  );
}

function Feedback({ status, message }: { status: "idle" | "success" | "error"; message: string }) {
  if (!message) return null;
  const success = status === "success";
  return (
    <p
      aria-live="polite"
      className={`rounded-xl px-3 py-2 text-sm font-bold ${
        success ? "bg-olive/10 text-olive" : "bg-clay/10 text-clay"
      }`}
    >
      {message}
    </p>
  );
}

export function HostDayForms({
  circles,
  defaultCapacity,
  minDate,
  defaultDate,
}: {
  circles: Circle[];
  defaultCapacity: number;
  minDate: string;
  defaultDate: string;
}) {
  const [ruleState, ruleAction] = useActionState(createRule, initialState);
  const [oneOffState, oneOffAction] = useActionState(createOneOffDay, initialState);

  return (
    <div className="space-y-2.5">
      <details className="panel p-4">
        <summary className="cursor-pointer text-sm font-semibold text-clay">
          + Nueva juntada recurrente
        </summary>
        <form action={ruleAction} className="mt-4 space-y-3">
          <div>
            <label className="label">Qué días</label>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_LABELS.map((label, i) => (
                <label key={i}>
                  <input type="checkbox" name="weekdays" value={i} className="peer sr-only" />
                  <span className="day-pill">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <TimeCapacityFields defaultCapacity={defaultCapacity} />
          <div>
            <label className="label">Quién puede venir</label>
            <CircleSelect circles={circles} />
          </div>
          <Feedback status={ruleState.status} message={ruleState.message} />
          <SubmitButton>Crear juntada recurrente</SubmitButton>
        </form>
      </details>

      <details className="panel p-4">
        <summary className="cursor-pointer text-sm font-semibold text-clay">
          + Nueva juntada
        </summary>
        <form action={oneOffAction} className="mt-4 space-y-3">
          <div>
            <label className="label">Fecha</label>
            <input
              name="date"
              type="date"
              min={minDate}
              defaultValue={defaultDate}
              required
              className="input"
            />
          </div>
          <TimeCapacityFields defaultCapacity={defaultCapacity} />
          <div>
            <label className="label">Quién puede venir</label>
            <CircleSelect circles={circles} />
          </div>
          <Feedback status={oneOffState.status} message={oneOffState.message} />
          <SubmitButton>Crear juntada</SubmitButton>
        </form>
      </details>
    </div>
  );
}
