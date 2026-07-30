import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { friendRequestsForUser, friendsOf, mutualFriends } from "@/lib/friends";
import { userProfilePath } from "@/lib/profile";
import { circlesOf, hostedJuntadasFor } from "@/lib/queries";
import { formatDay } from "@/lib/tz";
import { appUrl } from "@/lib/url";
import { Avatar } from "@/components/avatar";
import { FriendRequestSeenMarker } from "@/components/friend-request-seen-marker";
import { HostTag } from "@/components/host-tag";
import { MutualFriendsCount } from "@/components/mutual-friends";
import { Circles } from "@/components/friends/circles";
import { FriendList } from "@/components/friends/friend-list";
import { InviteHeader } from "@/components/friends/invite-header";
import { acceptFriendRequest, declineFriendRequest } from "@/lib/actions";

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
  // Requesters get the host count too: "this person actually has people over"
  // is most of the answer when you are deciding whether to let them in.
  const [incomingMutuals, hosted] = await Promise.all([
    mutualFriends(
      user.id,
      requests.incoming.map((request) => request.requester.id)
    ),
    hostedJuntadasFor([
      ...friends.map((friend) => friend.id),
      ...requests.incoming.map((request) => request.requester.id),
    ]),
  ]);
  const inviteUrl = `${appUrl()}/invite/${user.inviteToken}`;
  const unseenIncomingRequestIds = requests.incoming
    .filter((request) => request.friendsShownAt === null)
    .map((request) => request.id);

  return (
    <div>
      <FriendRequestSeenMarker requestIds={unseenIncomingRequestIds} />

      <InviteHeader inviteUrl={inviteUrl} subtitle="Solo tus amigos ven los días que abrís." />

      <div className="space-y-8">
        {/* Only what is waiting on you gets a card. Requests you sent are yours
            to remember, not yours to answer, so they fold into one line. */}
        {requests.incoming.length > 0 && (
          <section>
            <p className="eyebrow mb-3">Te quieren sumar · {requests.incoming.length}</p>
            <div className="space-y-2.5">
              {requests.incoming.map((request) => (
                <div
                  key={request.id}
                  className="request-card flex flex-wrap items-center gap-3.5 p-3.5 sm:flex-nowrap"
                >
                  <Link
                    href={userProfilePath(request.requester.id)}
                    className="profile-link flex min-w-0 flex-1 items-center gap-3.5 rounded-xl outline-none hover:text-clay focus-visible:ring-2 focus-visible:ring-clay/60"
                  >
                    <Avatar
                      name={request.requester.name}
                      image={request.requester.image}
                      size={44}
                      hosts={(hosted.get(request.requester.id) ?? 0) > 0}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <p data-profile-label className="truncate text-[15.5px] font-semibold text-ink">
                          {request.requester.name}
                        </p>
                        <HostTag count={hosted.get(request.requester.id) ?? 0} />
                      </div>
                      <p
                        data-profile-label={request.coworkDay ? undefined : ""}
                        className="truncate font-mono text-[11.5px] text-faded"
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
                  {/* Full width under the name on a phone, where a 44px row of
                      two buttons beside an avatar leaves neither one tappable. */}
                  <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:flex sm:w-auto">
                    <form action={acceptFriendRequest}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <button className="w-full cursor-pointer rounded-full bg-olive px-4 py-2.5 text-sm font-semibold text-on-action sm:py-2">
                        Aceptar
                      </button>
                    </form>
                    <form action={declineFriendRequest}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <button className="w-full cursor-pointer rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-faded hover:text-clay sm:py-2">
                        Rechazar
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>

            {requests.outgoing.length > 0 && <OutgoingRequests requests={requests.outgoing} />}
          </section>
        )}

        {requests.incoming.length === 0 && requests.outgoing.length > 0 && (
          <section>
            <OutgoingRequests requests={requests.outgoing} standalone />
          </section>
        )}

        <Circles
          circles={circles.map((circle) => ({
            id: circle.id,
            name: circle.name,
            members: circle.members.map((member) => member.user),
          }))}
          friends={friends.map((friend) => ({
            id: friend.id,
            name: friend.name,
            image: friend.image,
          }))}
        />

        <FriendList
          friends={friends.map((friend) => ({
            id: friend.id,
            name: friend.name,
            username: friend.username,
            email: friend.email,
            image: friend.image,
            hosted: hosted.get(friend.id) ?? 0,
          }))}
        />
      </div>
    </div>
  );
}

type OutgoingRequest = Awaited<ReturnType<typeof friendRequestsForUser>>["outgoing"][number];

/**
 * A <details>, not a client component: nothing here needs state the browser
 * cannot hold itself, and this way the list opens with JavaScript still loading.
 */
function OutgoingRequests({
  requests,
  standalone = false,
}: {
  requests: OutgoingRequest[];
  standalone?: boolean;
}) {
  return (
    <details className={`group ${standalone ? "" : "mt-3.5"}`}>
      <summary className="flex w-fit cursor-pointer list-none items-center gap-2 rounded-lg font-mono text-[12px] text-faded outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-clay/60 [&::-webkit-details-marker]:hidden">
        {requests.length} {requests.length === 1 ? "pedido" : "pedidos"} que mandaste vos
        <span aria-hidden="true" className="transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="mt-2.5 space-y-2.5">
        {requests.map((request) => (
          <div key={request.id} className="panel flex flex-wrap items-center gap-3 p-3">
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
            <span className="amenity">pendiente</span>
          </div>
        ))}
      </div>
    </details>
  );
}
