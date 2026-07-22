import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hostData, circlesOf } from "@/lib/queries";
import { materializeRules } from "@/lib/days";
import { formatDay, WEEKDAY_LABELS, addDays, todayBA } from "@/lib/tz";
import { AvatarStack } from "@/components/avatar";
import { SpotsChip } from "@/components/day-card";
import { HostPlaceForm } from "@/components/host-place-form";
import { HostDayForms } from "@/components/host-day-forms";
import { toggleRule, deleteRule, cancelDay } from "@/lib/actions";

export default async function HostPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  await materializeRules();
  const [{ place, rules, days }, circles] = await Promise.all([
    hostData(session.user.id),
    circlesOf(session.user.id),
  ]);

  return (
    <div>
      <h1 className="page-title">Ser anfitrión</h1>
      <p className="mt-2 mb-7 text-[15px] text-faded">
        Abrí tu casa, poné tus reglas, y elegí quién puede venir.
      </p>

      <div className="space-y-9">
        <section>
          <p className="eyebrow mb-2.5">Mi lugar</p>
          <HostPlaceForm place={place} />
        </section>

        {place && (
          <>
            <section>
              <p className="eyebrow mb-2.5">Reglas que se repiten</p>
              <p className="mb-3 text-sm text-faded">
                Los días recurrentes se abren solos con 3 semanas de anticipación. Podés pausar o
                cancelar cualquiera.
              </p>
              <div className="space-y-2.5">
                {rules.map((rule) => (
                  <div key={rule.id} className="panel flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1 text-sm">
                      <span className="font-semibold text-ink">
                        {rule.weekdays.split(",").map((d) => WEEKDAY_LABELS[Number(d)]).join(" · ")}
                      </span>{" "}
                      <span className="text-faded">
                        {rule.startTime}–{rule.endTime}
                      </span>
                      <div className="font-mono text-[12px] text-faded">
                        hasta {rule.capacity} · {rule.circle ? `“${rule.circle.name}”` : "todos"}
                        {!rule.active && " · pausada"}
                      </div>
                    </div>
                    <form action={toggleRule} title={rule.active ? "Pausar" : "Reanudar"}>
                      <input type="hidden" name="ruleId" value={rule.id} />
                      <button
                        aria-label={rule.active ? "Pausar" : "Reanudar"}
                        className={`relative h-[27px] w-[46px] cursor-pointer rounded-full transition-colors ${
                          rule.active ? "bg-clay" : "bg-[oklch(0.85_0.01_70)]"
                        }`}
                      >
                        <span
                          className={`absolute top-[3px] h-[21px] w-[21px] rounded-full bg-white shadow transition-[left] ${
                            rule.active ? "left-[22px]" : "left-[3px]"
                          }`}
                        />
                      </button>
                    </form>
                    <form action={deleteRule}>
                      <input type="hidden" name="ruleId" value={rule.id} />
                      <button className="font-mono text-[11px] text-faded hover:text-clay">
                        borrar
                      </button>
                    </form>
                  </div>
                ))}

                <HostDayForms
                  circles={circles}
                  defaultCapacity={place.defaultCapacity}
                  minDate={todayBA()}
                  defaultDate={addDays(todayBA(), 1)}
                />
              </div>
            </section>

            <section>
              <p className="eyebrow mb-2.5">Mis próximas juntadas</p>
              {days.length === 0 ? (
                <p className="text-sm text-faded">Todavía no abriste ningún día.</p>
              ) : (
                <div className="space-y-2.5">
                  {days.map((day) => (
                    <div key={day.id} className="panel flex items-center gap-3 p-4">
                      {day.place.photos[0] && (
                        <div className="h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-paper">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={day.place.photos[0].url}
                            alt={`Foto de ${day.place.nickname}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <Link href={`/day/${day.id}`} className="text-sm font-semibold text-ink hover:text-clay">
                          {formatDay(day.date)}{" "}
                          <span className="font-normal text-faded">
                            · {day.startTime}–{day.endTime}
                          </span>
                        </Link>
                        <div className="mt-1.5 flex items-center gap-2">
                          {day.attendances.length > 0 && (
                            <AvatarStack users={day.attendances.map((att) => att.user)} size={22} />
                          )}
                          <SpotsChip taken={day.attendances.length} capacity={day.capacity} />
                        </div>
                      </div>
                      <form action={cancelDay}>
                        <input type="hidden" name="dayId" value={day.id} />
                        <button className="font-mono text-[11px] text-faded hover:text-clay">
                          cancelar
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
