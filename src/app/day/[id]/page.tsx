import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { dayForUser } from "@/lib/queries";
import { formatDay } from "@/lib/tz";
import { Avatar } from "@/components/avatar";
import { JoinControls, SpotsChip } from "@/components/day-card";
import { cancelDay, removeAttendee } from "@/lib/actions";

export default async function DayPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const userId = session.user.id;

  const { id } = await params;
  const day = await dayForUser(id, userId);
  if (!day) notFound(); // includes days outside your audience: no negative space

  const isHost = day.hostId === userId;
  const cancelled = day.status === "cancelled";

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-[12px] font-bold tracking-[0.14em] uppercase text-faded">
        {formatDay(day.date)} · {day.date}
      </p>
      <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
        {day.place.nickname}
      </h1>
      <div className="mt-2 flex items-center gap-3">
        <Avatar name={day.host.name} image={day.host.image} size={28} />
        <span className="text-sm text-faded">
          Hosted by {isHost ? "you" : day.host.name} · {day.startTime}–{day.endTime}
        </span>
        <SpotsChip taken={day.attendances.length} capacity={day.capacity} />
      </div>

      {cancelled && (
        <div className="card mt-6 border-clay/40 bg-clay/5 text-sm font-bold text-clay">
          This day was cancelled.
        </div>
      )}

      <div className="card mt-6 space-y-3 text-sm">
        <div>
          <p className="label">Address</p>
          <p>{day.place.address || "Ask the host"}</p>
        </div>
        {day.place.arrivalNotes && (
          <div>
            <p className="label">Getting in</p>
            <p className="whitespace-pre-wrap">{day.place.arrivalNotes}</p>
          </div>
        )}
        {day.place.amenities && (
          <div>
            <p className="label">The setup</p>
            <div className="flex flex-wrap gap-1.5">
              {day.place.amenities.split(",").map((a) => (
                <span key={a} className="rounded-full bg-butter px-2.5 py-0.5 text-xs font-bold">
                  {a.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Who&apos;s coming</h2>
          {!cancelled && <JoinControls day={day} userId={userId} />}
        </div>
        {day.attendances.length === 0 ? (
          <p className="text-sm text-faded">No one yet — be the first.</p>
        ) : (
          <ul className="space-y-2">
            {day.attendances.map((a) => (
              <li key={a.user.id} className="flex items-center gap-3">
                <Avatar name={a.user.name} image={a.user.image} size={32} />
                <span className="flex-1 text-sm font-bold">
                  {a.user.name}
                  {a.user.id === userId && <span className="text-faded"> (you)</span>}
                </span>
                {isHost && (
                  <form action={removeAttendee}>
                    <input type="hidden" name="dayId" value={day.id} />
                    <input type="hidden" name="userId" value={a.user.id} />
                    <button className="text-xs font-bold text-faded hover:text-clay">
                      remove
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isHost && !cancelled && (
        <form action={cancelDay} className="mt-4">
          <input type="hidden" name="dayId" value={day.id} />
          <button className="btn-danger">Cancel this day</button>
        </form>
      )}
    </div>
  );
}
