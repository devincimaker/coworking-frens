import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Avatar } from "@/components/avatar";
import {
  type FriendConnectionState,
  friendConnectionStates,
} from "@/lib/friends";
import { userProfilePath } from "@/lib/profile";
import { prisma } from "@/lib/prisma";
import {
  acceptFriendRequest,
  declineFriendRequest,
  sendFriendRequestFromGente,
} from "@/lib/actions";

function GenteRequestControls({
  personId,
  state,
}: {
  personId: string;
  state: FriendConnectionState;
}) {
  if (state.kind === "friends") {
    return <span className="amenity bg-olive/10 text-olive">amigo</span>;
  }

  if (state.kind === "incoming_pending") {
    return (
      <div className="flex shrink-0 flex-wrap gap-1.5">
        <form action={acceptFriendRequest}>
          <input type="hidden" name="requestId" value={state.requestId} />
          <input type="hidden" name="profileUserId" value={personId} />
          <button className="rounded-full bg-olive px-3 py-1.5 text-sm font-semibold text-white">
            Aceptar
          </button>
        </form>
        <form action={declineFriendRequest}>
          <input type="hidden" name="requestId" value={state.requestId} />
          <input type="hidden" name="profileUserId" value={personId} />
          <button className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-faded hover:text-clay">
            Rechazar
          </button>
        </form>
      </div>
    );
  }

  if (state.kind === "outgoing_pending") {
    return <span className="amenity">pedido enviado</span>;
  }

  if (state.kind === "incoming_declined") {
    return <span className="amenity bg-clay/10 text-clay">rechazado</span>;
  }

  if (state.kind === "self") return null;

  return (
    <form action={sendFriendRequestFromGente}>
      <input type="hidden" name="recipientId" value={personId} />
      <input type="hidden" name="profileUserId" value={personId} />
      <button className={state.kind === "outgoing_declined" ? "btn-ghost" : "btn-primary"}>
        {state.kind === "outgoing_declined" ? "Pedir otra vez" : "Sumar amigo"}
      </button>
    </form>
  );
}

export default async function GentePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const userId = session.user.id;

  const people = await prisma.user.findMany({
    where: {
      id: { not: userId },
      onboardedAt: { not: null },
      name: { not: null },
      username: { not: null },
      bio: { not: "" },
    },
    orderBy: [{ name: "asc" }, { username: "asc" }],
    take: 120,
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
    },
  });
  const stateMap = await friendConnectionStates(
    userId,
    people.map((person) => person.id)
  );

  return (
    <div>
      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Gente</h1>
          <p className="mt-2 text-[15px] text-faded">
            Perfiles públicos; las juntadas siguen entre amigos.
          </p>
        </div>
        <span className="amenity w-fit">{people.length} perfiles</span>
      </div>

      {people.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-display text-xl font-semibold text-ink">
            No hay perfiles para mostrar.
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-faded">
            Cuando más gente complete su perfil, va a aparecer acá.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {people.map((person) => {
            const title = person.name ?? person.username ?? "Fren";
            const state = stateMap.get(person.id) ?? { kind: "none" };

            return (
              <article key={person.id} className="panel p-4 transition-colors hover:border-clay/30">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <Link
                    href={userProfilePath(person.id)}
                    aria-label={title}
                    className="profile-link flex min-w-0 items-start gap-3 rounded-lg outline-none hover:text-clay focus-visible:ring-2 focus-visible:ring-clay/60"
                  >
                    <Avatar name={title} image={person.image} size={54} />
                    <div className="min-w-0">
                      <h2 data-profile-label className="truncate font-display text-xl font-semibold tracking-tight text-ink">
                        {title}
                      </h2>
                      <p data-profile-label className="truncate font-mono text-[12px] text-faded">
                        @{person.username}
                      </p>
                    </div>
                  </Link>
                  {/* Avatar + gap keeps the controls and bio aligned with the name. */}
                  <div className="pl-[66px] sm:pl-0">
                    <GenteRequestControls personId={person.id} state={state} />
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words pl-[66px] text-sm leading-relaxed text-ink">
                  {person.bio}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
