"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { DayComposer, DayComposerPlaceholder } from "@/components/host/day-composer";
import { CheckIcon } from "@/components/host/icons";
import { OpenDayRow } from "@/components/host/open-day-row";
import { PlaceForm } from "@/components/host/place-form";
import { PlaceSummary } from "@/components/host/place-summary";
import { RuleCard } from "@/components/host/rule-card";
import type {
  HostCircle,
  HostDayData,
  HostPlaceData,
  HostRuleData,
} from "@/components/host/types";

const PROMISES = [
  "Vos elegís qué días abrís y quién puede venir.",
  "La dirección aparece recién cuando alguien se suma.",
  "Cancelás cuando quieras, sin explicar nada. Avisamos por mail.",
];

function FirstPlace({
  googleMapsApiKey,
  onCreated,
}: {
  googleMapsApiKey: string;
  onCreated: () => void;
}) {
  return (
    <>
      <h1 className="page-title">Abrí tu casa</h1>
      <p className="mt-2 mb-7 max-w-xl text-[15px] leading-relaxed text-faded">
        Tus amigos ya abren la de ellos. Falta la tuya: un nombre, dónde queda, cuántas sillas hay y
        unas fotos. El resto lo completás cuando quieras.
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PlaceForm
          place={null}
          googleMapsApiKey={googleMapsApiKey}
          mode="create"
          onSaved={onCreated}
        />
        <aside>
          <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface/60 p-[18px]">
            {PROMISES.map((promise, index) => (
              <div key={promise} className="flex gap-2.5">
                <span className="pt-0.5 font-mono text-[12px] text-clay">
                  0{index + 1}
                </span>
                <p className="text-sm leading-relaxed text-amenity-ink">{promise}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-faded">
            ¿Todavía no querés abrir la tuya?{" "}
            <Link href="/juntadas" className="font-semibold text-clay hover:text-clay-deep">
              Mirá las juntadas de tus amigos
            </Link>
            .
          </p>
        </aside>
      </div>
    </>
  );
}

function InviteBlock({ inviteUrl }: { inviteUrl: string }) {
  return (
    <section className="mt-8 rounded-[22px] border border-line bg-grape/[0.07] p-5 sm:p-[22px]">
      <h2 className="font-display text-xl font-bold text-ink">Cómo invitar gente</h2>
      <p className="mt-2 mb-3.5 max-w-xl text-sm leading-relaxed text-amenity-ink">
        Los días que abrís los ven solo tus amigos, y todavía no tenés ninguno. Mandales este link:
        quien entre queda como amigo tuyo — no hay búsqueda pública.
      </p>
      <div className="flex max-w-xl items-center gap-2.5">
        <code className="min-w-0 flex-1 truncate rounded-[13px] border border-line bg-surface px-3.5 py-2.5 font-mono text-[13px] text-grape-deep">
          {inviteUrl}
        </code>
        <CopyButton text={inviteUrl} label="Copiar link" className="bg-grape text-on-action" />
      </div>
    </section>
  );
}

export function HostScreen({
  hostId,
  place,
  days,
  rules,
  circles,
  friendCount,
  inviteUrl,
  googleMapsApiKey,
  today,
}: {
  hostId: string;
  place: HostPlaceData | null;
  days: HostDayData[];
  rules: HostRuleData[];
  circles: HostCircle[];
  friendCount: number;
  inviteUrl: string;
  googleMapsApiKey: string;
  today: string;
}) {
  const [editingPlace, setEditingPlace] = useState(false);
  const [daysBeingEdited, setDaysBeingEdited] = useState<string[]>([]);
  const [justCreated, setJustCreated] = useState(false);

  // Stable across renders: the rows report through it from an effect, so a fresh
  // identity every render would keep waking that effect up.
  const setDayEditing = useCallback((dayId: string, editing: boolean) => {
    setDaysBeingEdited((current) => {
      if (current.includes(dayId) === editing) return current;
      return editing ? [...current, dayId] : current.filter((id) => id !== dayId);
    });
  }, []);

  if (!place) {
    return <FirstPlace googleMapsApiKey={googleMapsApiKey} onCreated={() => setJustCreated(true)} />;
  }

  const takenSpots = days.reduce((total, day) => total + day.attendees.length, 0);
  const totalSpots = days.reduce((total, day) => total + day.capacity, 0);
  const composerBusy = editingPlace || daysBeingEdited.length > 0;
  const lastDay = days[days.length - 1];

  return (
    <>
      {/* Only until the first day exists: after that the screen is about days. */}
      {justCreated && days.length === 0 && (
        <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-olive/10 px-4 py-3 text-olive">
          <CheckIcon />
          <p className="text-sm leading-relaxed font-semibold">
            {place.nickname} ya existe. Todavía no lo vio nadie — se enteran cuando abras un día.
          </p>
        </div>
      )}

      <h1 className="page-title">Ser anfitrión</h1>
      <p className="mt-2 mb-6 text-[15px] text-faded">
        Abrí tu casa cuando quieras. Cancelás sin explicar nada.
      </p>

      {editingPlace ? (
        <div className="mb-6">
          <PlaceForm
            place={place}
            googleMapsApiKey={googleMapsApiKey}
            mode="edit"
            openDayCount={days.length}
            onSaved={() => setEditingPlace(false)}
            onCancel={() => setEditingPlace(false)}
          />
        </div>
      ) : (
        <PlaceSummary place={place} hostId={hostId} onEdit={() => setEditingPlace(true)} />
      )}

      {composerBusy ? (
        <DayComposerPlaceholder openDayCount={days.length} />
      ) : (
        <DayComposer
          today={today}
          openDates={days.map((day) => day.date)}
          circles={circles}
          friendCount={friendCount}
          defaultCapacity={place.defaultCapacity}
          defaultStartTime={lastDay?.startTime ?? "09:00"}
          defaultEndTime={lastDay?.endTime ?? "17:00"}
          isFirstDay={days.length === 0}
        />
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="eyebrow">Ya abiertos{days.length > 0 && ` · ${days.length}`}</h2>
          {totalSpots > 0 && (
            <span className="font-mono text-[12px] text-faded">
              {takenSpots} {takenSpots === 1 ? "silla tomada" : "sillas tomadas"} de {totalSpots}
            </span>
          )}
        </div>
        {days.length === 0 ? (
          <p className="text-sm leading-relaxed text-faded">
            Todavía ninguno. El primero que abras aparece acá con quiénes se van sumando.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {days.map((day) => (
              <OpenDayRow key={day.id} day={day} minDate={today} onEditingChange={setDayEditing} />
            ))}
          </div>
        )}
      </section>

      {rules.length > 0 && (
        <section className="mt-8">
          <h2 className="eyebrow mb-3">Lo que se repite</h2>
          <div className="flex flex-wrap gap-2.5">
            {rules.map((rule) => (
              <RuleCard key={rule.id} rule={rule} />
            ))}
          </div>
        </section>
      )}

      {friendCount === 0 && <InviteBlock inviteUrl={inviteUrl} />}
    </>
  );
}
