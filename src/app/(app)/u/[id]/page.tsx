import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Avatar } from "@/components/avatar";
import { accentFor, stripes } from "@/lib/accent";
import { type FriendConnectionState, friendConnectionStates } from "@/lib/friends";
import { dayInclude } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { formatDay, todayBA } from "@/lib/tz";
import {
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  sendFriendRequestFromDay,
  sendFriendRequestFromGente,
} from "@/lib/actions";

function relationshipLabel({
  isSelf,
  state,
  sharedDay,
}: {
  isSelf: boolean;
  state: FriendConnectionState;
  sharedDay: { id: string } | null;
}) {
  if (isSelf) return "Tu perfil";
  if (state.kind === "friends") return "Amigo";
  if (state.kind === "incoming_pending" || state.kind === "outgoing_pending") {
    return "Pedido pendiente";
  }
  if (sharedDay) return "Coincidieron en una juntada";
  return "En Frens";
}

function ProfileRelationshipActions({
  profileId,
  state,
  sharedDay,
}: {
  profileId: string;
  state: FriendConnectionState;
  sharedDay: { id: string; place: { nickname: string }; date: string } | null;
}) {
  if (state.kind === "self") {
    return (
      <Link href="/profile" className="btn-ghost">
        Editar perfil
      </Link>
    );
  }

  if (state.kind === "friends") {
    return (
      <form action={removeFriend}>
        <input type="hidden" name="friendId" value={profileId} />
        <button className="btn-danger">Quitar amigo</button>
      </form>
    );
  }

  if (state.kind === "incoming_pending") {
    return (
      <div className="flex flex-wrap gap-2">
        <form action={acceptFriendRequest}>
          <input type="hidden" name="requestId" value={state.requestId} />
          <input type="hidden" name="profileUserId" value={profileId} />
          <button className="btn-primary">Aceptar pedido</button>
        </form>
        <form action={declineFriendRequest}>
          <input type="hidden" name="requestId" value={state.requestId} />
          <input type="hidden" name="profileUserId" value={profileId} />
          <button className="btn-ghost">Rechazar</button>
        </form>
      </div>
    );
  }

  if (state.kind === "outgoing_pending") {
    return <span className="amenity">pedido enviado</span>;
  }

  if (state.kind === "incoming_declined") {
    return <span className="amenity">pedido rechazado</span>;
  }

  if (!sharedDay) {
    return (
      <form action={sendFriendRequestFromGente}>
        <input type="hidden" name="recipientId" value={profileId} />
        <input type="hidden" name="profileUserId" value={profileId} />
        <button className="btn-primary">
          {state.kind === "outgoing_declined" ? "Pedir otra vez" : "Sumar amigo"}
        </button>
      </form>
    );
  }

  return (
    <form action={sendFriendRequestFromDay}>
      <input type="hidden" name="dayId" value={sharedDay.id} />
      <input type="hidden" name="recipientId" value={profileId} />
      <input type="hidden" name="profileUserId" value={profileId} />
      <button className="btn-primary">
        {state.kind === "outgoing_declined" ? "Pedir otra vez" : "Sumar amigo"}
      </button>
    </form>
  );
}

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const viewerId = session.user.id;
  const { id } = await params;

  const profile = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      createdAt: true,
    },
  });
  if (!profile) notFound();

  const isSelf = profile.id === viewerId;
  const [stateMap, sharedDay, visibleHostedDays] = await Promise.all([
    isSelf
      ? Promise.resolve(new Map([[profile.id, { kind: "self" } satisfies FriendConnectionState]]))
      : friendConnectionStates(viewerId, [profile.id]),
    isSelf
      ? Promise.resolve(null)
      : prisma.coworkDay.findFirst({
          where: {
            AND: [
              { attendances: { some: { userId: viewerId } } },
              { attendances: { some: { userId: profile.id } } },
            ],
          },
          orderBy: [{ date: "desc" }, { startTime: "desc" }],
          select: {
            id: true,
            date: true,
            place: { select: { nickname: true } },
          },
        }),
    prisma.coworkDay.findMany({
      where: {
        hostId: profile.id,
        status: "open",
        date: { gte: todayBA() },
        OR: [{ hostId: viewerId }, { audience: { some: { userId: viewerId } } }],
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 3,
      include: dayInclude,
    }),
  ]);
  const title = profile.name ?? profile.username ?? "Perfil";
  const accent = accentFor(profile.id);
  const connectionState = stateMap.get(profile.id) ?? { kind: "none" };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/juntadas"
        className="mb-5 inline-flex items-center gap-1.5 font-mono text-[12px] font-medium text-faded hover:text-clay"
      >
        <span aria-hidden="true">‹</span>
        volver
      </Link>

      <section className="card overflow-hidden">
        <div className="h-16" style={{ background: stripes(accent, 18) }} />
        <div className="px-5 pb-5">
          <div className="-mt-9 flex flex-wrap items-end gap-4">
            <Avatar name={title} image={profile.image} size={78} ring />
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="truncate font-display text-3xl font-bold tracking-tight text-ink">
                {title}
              </h1>
              <p className="truncate font-mono text-xs text-faded">
                @{profile.username ?? profile.id.slice(0, 8)}
              </p>
            </div>
            <span className="amenity bg-olive/10 text-olive">
              {relationshipLabel({ isSelf, state: connectionState, sharedDay })}
            </span>
          </div>

          {profile.bio && (
            <p className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
              {profile.bio}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <ProfileRelationshipActions
              profileId={profile.id}
              state={connectionState}
              sharedDay={sharedDay}
            />
          </div>
          {sharedDay && !isSelf && connectionState.kind !== "friends" && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/day/${sharedDay.id}`} className="font-mono text-[12px] text-faded hover:text-clay">
                contexto: {sharedDay.place.nickname} · {formatDay(sharedDay.date)}
              </Link>
            </div>
          )}
        </div>
      </section>

      {visibleHostedDays.length > 0 && (
        <section className="mt-7">
          <p className="eyebrow mb-2.5">Juntadas visibles</p>
          <div className="space-y-2.5">
            {visibleHostedDays.map((day) => (
              <Link
                key={day.id}
                href={`/day/${day.id}`}
                className="panel flex items-center justify-between gap-3 p-3 hover:border-clay/30"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{day.place.nickname}</p>
                  <p className="font-mono text-[12px] text-faded">
                    {formatDay(day.date)} · {day.startTime}–{day.endTime}
                  </p>
                </div>
                <span className="font-mono text-[12px] text-faded">
                  {day.attendances.length}/{day.capacity}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
