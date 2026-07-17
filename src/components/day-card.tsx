import Link from "next/link";
import { Avatar, AvatarStack } from "@/components/avatar";
import { joinDay, leaveDay } from "@/lib/actions";

type DayWithRelations = {
  id: string;
  hostId: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  host: { id: string; name: string | null; image: string | null };
  place: { nickname: string };
  attendances: { user: { id: string; name: string | null; image: string | null } }[];
};

export function SpotsChip({ taken, capacity }: { taken: number; capacity: number }) {
  const left = capacity - taken;
  const full = left <= 0;
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
        full ? "bg-clay/15 text-clay" : "bg-olive/15 text-olive"
      }`}
    >
      {full ? "Full" : `${left} spot${left === 1 ? "" : "s"} left`}
    </span>
  );
}

export function JoinControls({ day, userId }: { day: DayWithRelations; userId: string }) {
  if (day.hostId === userId)
    return <span className="text-xs font-bold text-faded">You&apos;re hosting</span>;
  const joined = day.attendances.some((a) => a.user.id === userId);
  const full = day.attendances.length >= day.capacity;
  if (joined)
    return (
      <form action={leaveDay}>
        <input type="hidden" name="dayId" value={day.id} />
        <button className="btn-ghost">Leave</button>
      </form>
    );
  return (
    <form action={joinDay}>
      <input type="hidden" name="dayId" value={day.id} />
      <button className="btn-primary" disabled={full}>
        {full ? "Full" : "I'm in"}
      </button>
    </form>
  );
}

export function DayCard({ day, userId }: { day: DayWithRelations; userId: string }) {
  const attendees = day.attendances.map((a) => a.user);
  return (
    <div className="card flex items-center gap-4">
      <Avatar name={day.host.name} image={day.host.image} size={44} />
      <div className="min-w-0 flex-1">
        <Link href={`/day/${day.id}`} className="block">
          <div className="truncate font-display text-lg font-semibold leading-tight hover:text-clay">
            {day.place.nickname}
          </div>
          <div className="text-sm text-faded">
            {day.host.name?.split(" ")[0]} · {day.startTime}–{day.endTime}
          </div>
        </Link>
        <div className="mt-2 flex items-center gap-2.5">
          {attendees.length > 0 && <AvatarStack users={attendees} />}
          <SpotsChip taken={attendees.length} capacity={day.capacity} />
        </div>
      </div>
      <JoinControls day={day} userId={userId} />
    </div>
  );
}
