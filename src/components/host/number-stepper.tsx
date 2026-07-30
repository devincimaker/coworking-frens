"use client";

import { useId } from "react";
import { MAX_DAY_CAPACITY } from "@/lib/place";

/**
 * Chairs, everywhere they're set. Two buttons and a number beat a spinner here:
 * the range is 1–20 and the interesting edge is the floor, which the caller can
 * raise to "people already coming" and explain in `minReason`.
 */
export function NumberStepper({
  name,
  value,
  onChange,
  min = 1,
  max = MAX_DAY_CAPACITY,
  minReason,
  disabled = false,
  label = "sillas",
}: {
  name: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  minReason?: string;
  disabled?: boolean;
  label?: string;
}) {
  const valueId = useId();
  const atMin = value <= min;
  const atMax = value >= max;

  const buttonClass =
    "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface text-base leading-none text-ink shadow-nub-sm transition-transform active:scale-95 disabled:cursor-default disabled:opacity-45 disabled:shadow-none disabled:active:scale-100";

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center justify-between gap-1 rounded-xl border border-line bg-paper px-2 py-1">
        <button
          type="button"
          aria-label={`Una ${label.replace(/s$/, "")} menos`}
          aria-controls={valueId}
          title={atMin ? minReason : undefined}
          className={buttonClass}
          disabled={disabled || atMin}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <span id={valueId} aria-live="polite" className="font-mono text-[15px] font-medium text-ink">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Una ${label.replace(/s$/, "")} más`}
          aria-controls={valueId}
          className={buttonClass}
          disabled={disabled || atMax}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </button>
      </div>
      {minReason && atMin && (
        <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-faded">{minReason}</p>
      )}
    </div>
  );
}
