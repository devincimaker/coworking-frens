import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  FRIEND_REQUEST_DECLINED,
  friendRequestsForUser,
  friendsOf,
  mutualFriends,
} from "@/lib/friends";
import { userProfilePath } from "@/lib/profile";
import { circlesOf } from "@/lib/queries";
import { formatDay } from "@/lib/tz";
import { appUrl } from "@/lib/url";
import { Avatar } from "@/components/avatar";
import { CopyButton } from "@/components/copy-button";
import { FriendRequestSeenMarker } from "@/components/friend-request-seen-marker";
import { MutualFriendsCount } from "@/components/mutual-friends";
import {
  acceptFriendRequest,
  createCircle,
  declineFriendRequest,
  deleteCircle,
  toggleCircleMember,
} from "@/lib/actions";

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/signin"); // stale session: the signed-in id no longer exists
  const [friends, circles, requests] = await Promise.all([
    friendsOf(user.id),
    circlesOf(user.id),
    friendRequestsForUser(user.id),
  ]);
  // Deciding on an incoming request is exactly when a mutual friend is the answer
  // to "do I know this person?", so the count rides along with the request row.
  const incomingMutuals = await mutualFriends(
    user.id,
    requests.incoming.map((request) => request.requester.id)
  );
  const inviteUrl = `${appUrl()}/invite/${user.inviteToken}`;
  const requestCount = requests.incoming.length + requests.outgoing.length;
  const unseenIncomingRequestIds = requests.incoming
    .filter((request) => request.friendsShownAt === null)
    .map((request) => request.id);

  return (
    <div>
      <FriendRequestSeenMarker requestIds={unseenIncomingRequestIds} />
      <h1 className="page-title">Amigos</h1>
      <p className="mt-2 mb-7 text-[15px] text-faded">
        Tu gente y tus círculos. La amistad siempre es mutua.
      </p>

      <div className="space-y-9">
        <section
          className="rounded-[18px] p-5 text-white"
          style={{
            backgroundImage:
              "linear-gradient(135deg, var(--color-grape), var(--color-grape-deep))",
          }}
        >
          <div className="font-display text-base font-semibold">Tu link para sumar gente</div>
          <p className="mt-0.5 text-[13px] opacity-85">El que lo acepta queda como amigo tuyo.</p>
          <div className="mt-3.5 flex max-w-md gap-2">
            <code className="min-w-0 flex-1 truncate rounded-xl bg-white/15 px-3 py-2.5 font-mono text-[13px]">
              {inviteUrl}
            </code>
            <CopyButton text={inviteUrl} />
          </div>
        </section>

        <section>
          <p className="eyebrow mb-2.5">Pedidos ({requestCount})</p>
          {requestCount === 0 ? (
            <p className="text-sm text-faded">No tenés pedidos.</p>
          ) : (
            <div className="space-y-2.5">
              {requests.incoming.map((request) => (
                <div
                  key={request.id}
                  className="panel flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap"
                >
                  <Link
                    href={userProfilePath(request.requester.id)}
                    className="profile-link flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none hover:text-clay focus-visible:ring-2 focus-visible:ring-clay/60"
                  >
                    <Avatar name={request.requester.name} image={request.requester.image} size={38} />
                    <div className="min-w-0">
                      <p data-profile-label className="truncate text-[15px] font-medium text-ink">
                        {request.requester.name}
                      </p>
                      <p
                        data-profile-label={request.coworkDay ? undefined : ""}
                        className="truncate font-mono text-[11px] text-faded"
                      >
                        {request.coworkDay
                          ? `${request.coworkDay.place.nickname} · ${formatDay(request.coworkDay.date)}`
                          : `@${request.requester.username ?? request.requester.email.split("@")[0]}`}
                      </p>
                      <MutualFriendsCount
                        people={incomingMutuals.get(request.requester.id) ?? []}
                      />
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <form action={acceptFriendRequest}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <button className="rounded-full bg-olive px-3 py-1.5 text-sm font-semibold text-white">
                        Aceptar
                      </button>
                    </form>
                    <form action={declineFriendRequest}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <button className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-faded hover:text-clay">
                        Rechazar
                      </button>
                    </form>
                  </div>
                </div>
              ))}

              {requests.outgoing.map((request) => (
                <div
                  key={request.id}
                  className="panel flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap"
                >
                  <Link
                    href={userProfilePath(request.recipient.id)}
                    className="profile-link flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none hover:text-clay focus-visible:ring-2 focus-visible:ring-clay/60"
                  >
                    <Avatar name={request.recipient.name} image={request.recipient.image} size={38} />
                    <div className="min-w-0">
                      <p data-profile-label className="truncate text-[15px] font-medium text-ink">
                        {request.recipient.name}
                      </p>
                      <p
                        data-profile-label={request.coworkDay ? undefined : ""}
                        className="truncate font-mono text-[11px] text-faded"
                      >
                        {request.coworkDay
                          ? `${request.coworkDay.place.nickname} · ${formatDay(request.coworkDay.date)}`
                          : `@${request.recipient.username ?? request.recipient.email.split("@")[0]}`}
                      </p>
                    </div>
                  </Link>
                  <span
                    className={
                      request.status === FRIEND_REQUEST_DECLINED
                        ? "amenity bg-clay/10 text-clay"
                        : "amenity"
                    }
                  >
                    {request.status === FRIEND_REQUEST_DECLINED ? "rechazado" : "pendiente"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="eyebrow">Mis círculos</p>
          </div>
          <p className="mb-3 text-sm text-faded">
            Grupos privados de tus amigos, para cuando un día no es para todos. Nadie ve tus
            círculos.
          </p>
          <div className="space-y-2.5">
            {circles.map((circle) => {
              const memberIds = new Set(circle.members.map((m) => m.user.id));
              return (
                <div key={circle.id} className="panel p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold text-ink">“{circle.name}”</h3>
                    <form action={deleteCircle}>
                      <input type="hidden" name="circleId" value={circle.id} />
                      <button className="font-mono text-[11px] text-faded hover:text-clay">
                        borrar
                      </button>
                    </form>
                  </div>
                  {friends.length === 0 ? (
                    <p className="mt-2 text-sm text-faded">Primero sumá amigos.</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {friends.map((f) => {
                        const inCircle = memberIds.has(f.id);
                        return (
                          <form key={f.id} action={toggleCircleMember}>
                            <input type="hidden" name="circleId" value={circle.id} />
                            <input type="hidden" name="friendId" value={f.id} />
                            <button
                              className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                                inCircle
                                  ? "border-olive bg-olive text-white"
                                  : "border-line text-faded hover:border-olive/60"
                              }`}
                            >
                              {inCircle ? "✓ " : "+ "}
                              {f.name?.split(" ")[0]}
                            </button>
                          </form>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <form action={createCircle} className="panel flex items-center gap-2 p-3">
              <input
                name="name"
                placeholder="Nuevo círculo, ej. “los del deep work”"
                required
                className="input flex-1"
              />
              <button className="btn-ghost shrink-0">Crear</button>
            </form>
          </div>
        </section>

        <section>
          <p className="eyebrow mb-2.5">Todos ({friends.length})</p>
          {friends.length === 0 ? (
            <p className="text-sm text-faded">
              Todavía no tenés amigos — mandá tu link de arriba.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2">
              {friends.map((f) => (
                <Link
                  key={f.id}
                  href={userProfilePath(f.id)}
                  className="profile-link flex items-center gap-3 rounded-xl py-2 outline-none hover:text-clay focus-visible:ring-2 focus-visible:ring-clay/60"
                >
                  <Avatar name={f.name} image={f.image} size={38} />
                  <div className="min-w-0">
                    <p data-profile-label className="truncate text-[15px] font-medium text-ink">{f.name}</p>
                    <p data-profile-label className="truncate font-mono text-[11px] text-faded">
                      @{f.username ?? f.email.split("@")[0]}
                    </p>
                    {f.bio && <p className="truncate text-xs text-faded">{f.bio}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
