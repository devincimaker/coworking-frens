import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { feedDays } from "@/lib/queries";
import { materializeRules } from "@/lib/days";
import { formatDay } from "@/lib/tz";
import { DayCard } from "@/components/day-card";

export default async function FeedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const userId = session.user.id;

  await materializeRules();
  const days = await feedDays(userId);

  const byDate = new Map<string, typeof days>();
  for (const day of days) {
    byDate.set(day.date, [...(byDate.get(day.date) ?? []), day]);
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        Where are we <em className="text-clay">working</em>?
      </h1>

      {days.length === 0 && (
        <div className="card mt-8 text-center">
          <p className="font-display text-xl font-semibold">Nothing on the calendar yet.</p>
          <p className="mt-1 text-sm text-faded">
            Open your place, or send a friend your invite link so their days show up here.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/host" className="btn-primary">
              Open my place
            </Link>
            <Link href="/friends" className="btn-ghost">
              Invite friends
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-8">
        {[...byDate.entries()].map(([date, group]) => (
          <section key={date}>
            <h2 className="mb-3 text-[12px] font-bold tracking-[0.14em] uppercase text-faded">
              {formatDay(date)}
              <span className="ml-2 font-normal normal-case tracking-normal">{date}</span>
            </h2>
            <div className="space-y-3">
              {group.map((day) => (
                <DayCard key={day.id} day={day} userId={userId} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
