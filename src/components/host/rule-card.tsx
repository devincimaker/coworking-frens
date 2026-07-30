"use client";

import { useState, useTransition } from "react";
import { deleteRule, toggleRule } from "@/lib/actions";
import { WEEKDAY_LABELS } from "@/lib/tz";
import { XIcon } from "@/components/host/icons";
import type { HostRuleData } from "@/components/host/types";

/**
 * A rule is a standing arrangement, not an event: the card states it in one line
 * and gives you the switch. Deleting also cancels the days it already opened, so
 * that one asks first.
 */
export function RuleCard({ rule }: { rule: HostRuleData }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, startTransition] = useTransition();

  const days = rule.weekdays.map((day) => WEEKDAY_LABELS[day]).join(" y ");
  const audience = rule.circleName ? `“${rule.circleName}”` : "todos";
  const count = rule.openDayCount;

  // Pausing leaves whatever it already opened on the calendar, so the line has to
  // say so — otherwise "pausada" reads as if the days went away with it.
  const status = [
    rule.active ? "activa" : "pausada",
    ...(count === 0
      ? []
      : rule.active
        ? [`${count} ${count === 1 ? "día abierto" : "días abiertos"}`]
        : [
            `${count === 1 ? "queda 1 abierta" : `quedan ${count} abiertas`}, no se abren más`,
          ]),
    audience,
  ].join(" · ");

  if (confirming) {
    return (
      <div className="flex flex-col gap-2.5 rounded-2xl border border-coral-200 bg-coral-100/60 px-3.5 py-3">
        <p className="max-w-xs text-[13px] leading-relaxed text-ink">
          ¿Borrás <strong className="font-semibold">{days}</strong>?
          {rule.openDayCount > 0
            ? ` Cancelamos ${rule.openDayCount === 1 ? "el día que ya abrió" : `los ${rule.openDayCount} días que ya abrió`} y les avisamos.`
            : " Todavía no abrió ninguno."}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost px-3 py-2 text-[13px]"
            disabled={busy}
            onClick={() => setConfirming(false)}
          >
            Dejarla
          </button>
          <button
            type="button"
            className="btn-primary px-3 py-2 text-[13px]"
            disabled={busy}
            onClick={() => {
              const data = new FormData();
              data.append("ruleId", rule.id);
              startTransition(() => deleteRule(data));
            }}
          >
            {busy ? "Borrando…" : "Sí, borrar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/60 px-3.5 py-3">
      <form action={toggleRule} className="flex">
        <input type="hidden" name="ruleId" value={rule.id} />
        <button
          aria-label={
            rule.active ? `Pausar los ${days.toLowerCase()}` : `Reanudar los ${days.toLowerCase()}`
          }
          aria-pressed={rule.active}
          title={rule.active ? "Pausar" : "Reanudar"}
          className={`relative h-[27px] w-[46px] shrink-0 cursor-pointer rounded-full transition-colors ${
            rule.active ? "bg-clay" : "bg-track"
          }`}
        >
          <span
            className={`absolute top-[3px] h-[21px] w-[21px] rounded-full bg-knob shadow-nub transition-[left] ${
              rule.active ? "left-[22px]" : "left-[3px]"
            }`}
          />
        </button>
      </form>

      <div className="min-w-0">
        <div className={`text-sm font-semibold ${rule.active ? "text-ink" : "text-faded"}`}>
          {days} · {rule.startTime}–{rule.endTime}
        </div>
        <div className="font-mono text-[11px] text-faded">{status}</div>
      </div>

      <button
        type="button"
        aria-label={`Borrar la regla de los ${days.toLowerCase()}`}
        title="Borrar"
        className="ml-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-faded transition-colors hover:bg-clay/10 hover:text-clay"
        onClick={() => setConfirming(true)}
      >
        <XIcon size={14} />
      </button>
    </div>
  );
}
