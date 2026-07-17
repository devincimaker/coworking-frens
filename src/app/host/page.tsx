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
      <option value="">All my friends</option>
      {circles.map((c) => (
        <option key={c.id} value={c.id}>
          Only “{c.name}”
        </option>
      ))}
    </select>
  );
}

function TimeCapacityFields({ defaultCapacity }: { defaultCapacity: number }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div>
        <label className="label">From</label>
        <input name="startTime" type="time" defaultValue="09:00" required className="input" />
      </div>
      <div>
        <label className="label">Until</label>
        <input name="endTime" type="time" defaultValue="17:00" required className="input" />
      </div>
      <div>
        <label className="label">Spots</label>
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
    <div className="space-y-10">
      <section>
        <h1 className="section-title">Your place</h1>
        <form action={savePlace} className="card mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Nickname</label>
              <input
                name="nickname"
                defaultValue={place?.nickname ?? ""}
                placeholder="El Nido"
                required
                className="input"
              />
            </div>
            <div>
              <label className="label">Default spots</label>
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
            <label className="label">Address</label>
            <input
              name="address"
              defaultValue={place?.address ?? ""}
              placeholder="Gorriti 4380, Palermo"
              required
              className="input"
            />
          </div>
          <div>
            <label className="label">Getting in (shown to attendees)</label>
            <textarea
              name="arrivalNotes"
              defaultValue={place?.arrivalNotes ?? ""}
              placeholder="Ring 3B, dog is friendly, wifi pass on the fridge"
              rows={2}
              className="input"
            />
          </div>
          <div>
            <label className="label">The setup (comma-separated)</label>
            <input
              name="amenities"
              defaultValue={place?.amenities ?? ""}
              placeholder="fast wifi, 2 monitors, espresso, balcony"
              className="input"
            />
          </div>
          <button className="btn-primary">{place ? "Save" : "Create my place"}</button>
        </form>
      </section>

      {place && (
        <>
          <section>
            <h2 className="section-title">Open days</h2>
            <p className="mt-1 text-sm text-faded">
              Recurring days auto-open 3 weeks ahead. Cancel any single day below.
            </p>
            <div className="mt-3 space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="card flex items-center gap-3 py-4">
                  <div className="flex-1 text-sm">
                    <span className="font-bold">
                      {rule.weekdays.split(",").map((d) => WEEKDAY_LABELS[Number(d)]).join(" · ")}
                    </span>{" "}
                    <span className="text-faded">
                      {rule.startTime}–{rule.endTime} · {rule.capacity} spots ·{" "}
                      {rule.circle ? `“${rule.circle.name}”` : "all friends"}
                      {!rule.active && " · paused"}
                    </span>
                  </div>
                  <form action={toggleRule}>
                    <input type="hidden" name="ruleId" value={rule.id} />
                    <button className="btn-ghost px-3 py-1 text-xs">
                      {rule.active ? "Pause" : "Resume"}
                    </button>
                  </form>
                  <form action={deleteRule}>
                    <input type="hidden" name="ruleId" value={rule.id} />
                    <button className="btn-danger px-3 py-1 text-xs">Delete</button>
                  </form>
                </div>
              ))}

              <details className="card">
                <summary className="cursor-pointer font-display font-semibold">
                  + Recurring weekly days
                </summary>
                <form action={createRule} className="mt-4 space-y-3">
                  <div>
                    <label className="label">Which days</label>
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
                    <label className="label">Who can come</label>
                    <CircleSelect circles={circles} />
                  </div>
                  <button className="btn-primary">Open these days</button>
                </form>
              </details>

              <details className="card">
                <summary className="cursor-pointer font-display font-semibold">
                  + Single day
                </summary>
                <form action={createOneOffDay} className="mt-4 space-y-3">
                  <div>
                    <label className="label">Date</label>
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
                    <label className="label">Who can come</label>
                    <CircleSelect circles={circles} />
                  </div>
                  <button className="btn-primary">Open this day</button>
                </form>
              </details>
            </div>
          </section>

          <section>
            <h2 className="section-title">Upcoming at yours</h2>
            {days.length === 0 ? (
              <p className="mt-2 text-sm text-faded">No open days yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {days.map((day) => (
                  <div key={day.id} className="card flex items-center gap-3 py-4">
                    <div className="min-w-0 flex-1">
                      <Link href={`/day/${day.id}`} className="font-bold hover:text-clay">
                        {formatDay(day.date)}{" "}
                        <span className="font-normal text-faded">
                          · {day.startTime}–{day.endTime}
                        </span>
                      </Link>
                      <div className="mt-1.5 flex items-center gap-2">
                        {day.attendances.length > 0 && (
                          <AvatarStack users={day.attendances.map((a) => a.user)} size={22} />
                        )}
                        <SpotsChip taken={day.attendances.length} capacity={day.capacity} />
                      </div>
                    </div>
                    <form action={cancelDay}>
                      <input type="hidden" name="dayId" value={day.id} />
                      <button className="btn-danger px-3 py-1 text-xs">Cancel</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
