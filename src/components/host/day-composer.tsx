"use client";

import { useActionState, useId, useRef, useState } from "react";
import { openDay } from "@/lib/actions";
import {
  addDays,
  formatDayPhrase,
  formatDayShort,
  weekdayOf,
  WEEKDAY_PLURAL,
} from "@/lib/tz";
import { NumberStepper } from "@/components/host/number-stepper";
import { MinimizeIcon } from "@/components/host/icons";
import type { HostCircle, HostFormState } from "@/components/host/types";

const initialState: HostFormState = {
  status: "idle",
  message: "",
};

const PILL_DAYS = 7;

const pillBase =
  "cursor-pointer rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors";

/** The strip the composer folds into while the house form is open above it. */
export function DayComposerPlaceholder({ openDayCount }: { openDayCount: number }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-[22px] border border-line bg-surface/60 px-5 py-4 opacity-55">
      <span className="font-display text-xl font-bold text-ink">Abrir un día</span>
      <span className="font-mono text-[12px] text-faded">
        {openDayCount > 0 &&
          `${openDayCount} ${openDayCount === 1 ? "día ya abierto" : "días ya abiertos"} · `}
        terminá de editar y seguí acá
      </span>
    </div>
  );
}

export function DayComposer({
  today,
  openDates,
  circles,
  friendCount,
  defaultCapacity,
  defaultStartTime,
  defaultEndTime,
  isFirstDay,
}: {
  today: string;
  openDates: string[];
  circles: HostCircle[];
  friendCount: number;
  defaultCapacity: number;
  defaultStartTime: string;
  defaultEndTime: string;
  isFirstDay: boolean;
}) {
  const dateWindow = Array.from({ length: PILL_DAYS }, (_, i) => addDays(today, i));
  const taken = new Set(openDates);
  // Starts at tomorrow: today is still one tap away, but it's rarely the one
  // being offered — nobody gets to rearrange their morning on that notice.
  const nextFree =
    dateWindow.slice(1).find((option) => !taken.has(option)) ?? addDays(today, PILL_DAYS);

  // The card is the card — it just isn't always on screen. Closed, this is one
  // button; open, it is the whole composer, unchanged. It stays mounted while
  // folded, so minimising keeps a half-written mood instead of eating it.
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(nextFree);
  const [capacity, setCapacity] = useState(defaultCapacity);
  const [repeat, setRepeat] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const groupId = useId();

  // The day that just opened is no longer free: the quick pick slides to the next
  // gap on its own. A date typed by hand stays put — that choice was deliberate,
  // and the button says plainly that it's already open.
  const date = dateWindow.includes(picked) && taken.has(picked) ? nextFree : picked;

  // Only after a day is actually opened: that draft is spent, and the next one
  // should start clean rather than inheriting the last one's mood.
  function clear() {
    formRef.current?.reset();
    setPicked(nextFree);
    setCapacity(defaultCapacity);
    setRepeat(false);
    setCustomOpen(false);
  }

  const [state, formAction, pending] = useActionState(
    async (previous: HostFormState, formData: FormData) => {
      const result = await openDay(previous, formData);
      // The day is now in the list below; the composer folds away again.
      if (result.status === "success") {
        clear();
        setOpen(false);
      }
      return result;
    },
    initialState
  );

  const weekday = weekdayOf(date);
  const alreadyOpen = taken.has(date);

  const pillDates = dateWindow.includes(date) ? dateWindow : [...dateWindow, date].sort();

  return (
    <div className="mb-8">
      {!open && (
        <div className="card flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-[22px]">
          <div className="min-w-0">
            <h2 className="font-display text-[22px] font-bold text-ink">¿Armás una juntada?</h2>
            <p className="mt-0.5 text-[15px] text-faded">
              Fecha, horario, cuántas sillas y el mood.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary shrink-0 px-5 py-3 text-[15px]"
            onClick={() => setOpen(true)}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              +
            </span>
            Abrir un día
          </button>
        </div>
      )}

      {/* A day that just opened still owes you a word, even with the card folded. */}
      {!open && state.message && (
        <p
          aria-live="polite"
          className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${
            state.status === "success" ? "bg-olive/10 text-olive" : "bg-clay/10 text-clay"
          }`}
        >
          {state.message}
        </p>
      )}

      <form
        ref={formRef}
        action={formAction}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className={`card border-coral-200 shadow-card p-5 sm:p-[22px] ${open ? "" : "hidden"}`}
      >
        <input type="hidden" name="date" value={date} />

        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h2 className="font-display text-[22px] font-bold text-ink">
            {isFirstDay ? "Abrí tu primer día" : "Abrir un día"}
          </h2>
          <div className="flex min-w-0 items-center gap-3">
            <p className="min-w-0 font-mono text-[12px] text-faded">
              {friendCount === 0
                ? "por ahora no hay nadie a quien avisar"
                : isFirstDay
                  ? `${friendCount} ${friendCount === 1 ? "amigo va" : "amigos van"} a recibir el aviso`
                  : "se avisa por mail a quienes puedan venir"}
            </p>
            {/* Folds the card back to its strip. Nothing typed is lost. */}
            <button
              type="button"
              aria-label="Minimizar"
              aria-expanded={open}
              title="Minimizar"
              className="flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-faded transition-colors hover:bg-amenity hover:text-ink active:scale-[0.96]"
              onClick={() => setOpen(false)}
            >
              <MinimizeIcon />
            </button>
          </div>
        </div>

        <fieldset className="mb-4">
          <legend className="sr-only">Qué día abrís</legend>
          <div className="flex flex-wrap gap-1.5">
            {pillDates.map((option) => {
              const isOpen = taken.has(option);
              const checked = option === date;
              return (
                <label key={option} className={isOpen ? "cursor-default" : undefined}>
                  <input
                    type="radio"
                    name="datePick"
                    className="peer sr-only"
                    value={option}
                    checked={checked}
                    disabled={isOpen}
                    onChange={() => {
                      setPicked(option);
                      setCustomOpen(false);
                    }}
                  />
                  <span
                    title={isOpen ? "Ya tenés este día abierto" : undefined}
                    className={`${pillBase} border-line text-faded peer-checked:border-clay peer-checked:bg-clay peer-checked:text-white peer-checked:shadow-[0_10px_22px_-12px_var(--color-clay)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-ink-900 ${
                      isOpen ? "cursor-default opacity-45" : "hover:border-rule-hover hover:text-ink"
                    }`}
                  >
                    {formatDayShort(option)}
                    {isOpen && " · abierto"}
                  </span>
                </label>
              );
            })}

            {customOpen ? (
              <input
                type="date"
                aria-label="Otra fecha"
                autoFocus
                min={today}
                value={date}
                onChange={(event) => event.target.value && setPicked(event.target.value)}
                className="rounded-full border border-clay bg-paper px-3.5 py-2 text-sm font-semibold text-ink outline-none"
              />
            ) : (
              <button
                type="button"
                className={`${pillBase} border-dashed border-rule-strong text-faded hover:border-clay hover:text-clay`}
                onClick={() => setCustomOpen(true)}
              >
                Otra fecha…
              </button>
            )}
          </div>
        </fieldset>

        <div className="mb-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[1.1fr_1.1fr_0.9fr_1.6fr]">
          <div>
            <label htmlFor={`${groupId}-start`} className="label">
              Desde
            </label>
            <input
              id={`${groupId}-start`}
              name="startTime"
              type="time"
              defaultValue={defaultStartTime}
              required
              className="input"
            />
          </div>
          <div>
            <label htmlFor={`${groupId}-end`} className="label">
              Hasta
            </label>
            <input
              id={`${groupId}-end`}
              name="endTime"
              type="time"
              defaultValue={defaultEndTime}
              required
              className="input"
            />
          </div>
          <div>
            <p className="label">Sillas · solo este día</p>
            <NumberStepper name="capacity" value={capacity} onChange={setCapacity} />
          </div>
          <div>
            <label htmlFor={`${groupId}-circle`} className="label">
              Quién puede venir
            </label>
            <select id={`${groupId}-circle`} name="circleId" defaultValue="" className="input">
              <option value="">Todos mis amigos</option>
              {circles.map((circle) => (
                <option key={circle.id} value={circle.id}>
                  Solo “{circle.name}”
                </option>
              ))}
            </select>
          </div>
        </div>

        <label htmlFor={`${groupId}-mood`} className="sr-only">
          El mood del día
        </label>
        <textarea
          id={`${groupId}-mood`}
          name="description"
          rows={2}
          maxLength={280}
          placeholder="El mood del día: silencio hasta las 13, después mate y calls en el balcón…"
          className="input resize-y leading-relaxed"
        />

        {state.message && (
          <p
            aria-live="polite"
            className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${
              state.status === "success" ? "bg-olive/10 text-olive" : "bg-clay/10 text-clay"
            }`}
          >
            {state.message}
          </p>
        )}

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              name="repeat"
              className="peer sr-only"
              checked={repeat}
              onChange={(event) => setRepeat(event.target.checked)}
            />
            <span
              aria-hidden="true"
              className="relative block h-[27px] w-[46px] shrink-0 rounded-full bg-[oklch(0.85_0.01_70)] transition-colors peer-checked:bg-clay peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-ink-900"
            >
              <span
                className={`absolute top-[3px] h-[21px] w-[21px] rounded-full bg-white shadow-[0_1px_2px_rgba(60,40,20,0.2)] transition-[left] ${
                  repeat ? "left-[22px]" : "left-[3px]"
                }`}
              />
            </span>
            <span className="text-sm text-amenity-ink">
              Repetir todos los {WEEKDAY_PLURAL[weekday]} — se abre solo con 3 semanas
            </span>
          </label>

          <button className="btn-primary px-5 py-3 text-[15px]" disabled={pending || alreadyOpen}>
            {pending
              ? "Abriendo…"
              : alreadyOpen
                ? "Ese día ya está abierto"
                : repeat
                  ? `Abrir todos los ${WEEKDAY_PLURAL[weekday]}`
                  : `Abrir ${formatDayPhrase(date)}`}
          </button>
        </div>
      </form>
    </div>
  );
}
