import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hostData, circlesOf } from "@/lib/queries";
import { materializeRules } from "@/lib/days";
import { formatDay, WEEKDAY_LABELS, addDays, todayBA } from "@/lib/tz";
import { AvatarStack } from "@/components/avatar";
import { SpotsChip } from "@/components/day-card";
import {
  savePlace,
  createOneOffDay,
  createRule,
  toggleRule,
  deleteRule,
  cancelDay,
} from "@/lib/actions";

function CircleSelect({
  circles,
  defaultValue,
}: {
  circles: { id: string; name: string }[];
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
          <form action={savePlace} className="card space-y-3 p-5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Nombre</label>
                <input
                  name="nickname"
                  defaultValue={place?.nickname ?? ""}
                  placeholder="El Nido"
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="label">Lugares por defecto</label>
                <input
                  name="defaultCapacity"
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={place?.defaultCapacity ?? 4}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="label">Dirección</label>
              <input
                name="address"
                defaultValue={place?.address ?? ""}
                placeholder="Gorriti 4380, Palermo"
                required
                className="input"
              />
            </div>
            <div>
              <label className="label">Cómo llegar (lo ven los que van)</label>
              <textarea
                name="arrivalNotes"
                defaultValue={place?.arrivalNotes ?? ""}
                placeholder="Tocá 3B, el perro es amigable, la clave del wifi está en la heladera"
                rows={2}
                className="input"
              />
            </div>
            <div>
              <label className="label">El setup (separado por comas)</label>
              <input
                name="amenities"
                defaultValue={place?.amenities ?? ""}
                placeholder="wifi rápido, 2 monitores, café, balcón"
                className="input"
              />
            </div>
            <button className="btn-primary">{place ? "Guardar" : "Crear mi lugar"}</button>
          </form>
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

                <details className="panel p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-clay">
                    + Días fijos por semana
                  </summary>
                  <form action={createRule} className="mt-4 space-y-3">
                    <div>
                      <label className="label">Qué días</label>
                      <div className="flex flex-wrap gap-1.5">
                        {WEEKDAY_LABELS.map((label, i) => (
                          <label key={i}>
                            <input
                              type="checkbox"
                              name="weekdays"
                              value={i}
                              className="peer sr-only"
                            />
                            <span className="day-pill">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <TimeCapacityFields defaultCapacity={place.defaultCapacity} />
                    <div>
                      <label className="label">Quién puede venir</label>
                      <CircleSelect circles={circles} />
                    </div>
                    <button className="btn-primary">Abrir estos días</button>
                  </form>
                </details>

                <details className="panel p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-clay">
                    + Un día suelto
                  </summary>
                  <form action={createOneOffDay} className="mt-4 space-y-3">
                    <div>
                      <label className="label">Fecha</label>
                      <input
                        name="date"
                        type="date"
                        min={todayBA()}
                        defaultValue={addDays(todayBA(), 1)}
                        required
                        className="input"
                      />
                    </div>
                    <TimeCapacityFields defaultCapacity={place.defaultCapacity} />
                    <div>
                      <label className="label">Quién puede venir</label>
                      <CircleSelect circles={circles} />
                    </div>
                    <button className="btn-primary">Abrir este día</button>
                  </form>
                </details>
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
