import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { feedDays } from "@/lib/queries";
import { materializeRules } from "@/lib/days";
import { mutualFriends, unseenJuntadasFriendRequests } from "@/lib/friends";
import { userProfilePath } from "@/lib/profile";
import { formatDay } from "@/lib/tz";
import { DayCard } from "@/components/day-card";
import { JuntadasFriendRequests } from "@/components/juntadas-friend-requests";

export default async function FeedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const userId = session.user.id;

  await materializeRules();
  const [days, friendRequests] = await Promise.all([
    feedDays(userId),
    unseenJuntadasFriendRequests(userId),
  ]);
  const requestMutuals = await mutualFriends(
    userId,
    friendRequests.map((request) => request.requester.id)
  );

  const requestRows = friendRequests.map((request) => {
    const mutuals = requestMutuals.get(request.requester.id) ?? [];
    const fallbackName = request.requester.username ?? request.requester.email.split("@")[0];
    const signal =
      mutuals.length > 0
        ? `${mutuals.length} ${mutuals.length === 1 ? "amigo" : "amigos"} en común`
        : request.coworkDay
          ? `${request.coworkDay.place.nickname} · ${formatDay(request.coworkDay.date)}`
          : `@${fallbackName}`;

    return {
      id: request.id,
      profileHref: userProfilePath(request.requester.id),
      requester: {
        name: request.requester.name,
        image: request.requester.image,
        fallbackName,
      },
      signal,
    };
  });

  return (
    <div>
      <h1 className="page-title">Próximas juntadas</h1>
      <p className="mt-2 mb-7 text-[15px] text-faded">
        Cuándo, en la casa de quién, y quiénes van. Sumate a la que quieras.
      </p>

      <JuntadasFriendRequests initialRequests={requestRows} />

      {days.length === 0 ? (
        <div className="card mt-2 p-8 text-center">
          <p className="font-display text-xl font-semibold text-ink">
            Todavía no hay nada en la agenda.
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-faded">
            Abrí tu lugar, o mandale tu link a un amigo para que sus días aparezcan acá.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/host" className="btn-primary">
              Abrir mi lugar
            </Link>
            <Link href="/friends" className="btn-ghost">
              Invitar amigos
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map((day) => (
            <DayCard key={day.id} day={day} userId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}
