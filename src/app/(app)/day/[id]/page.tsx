import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { dayForUser, hostedJuntadasFor } from "@/lib/queries";
import { formatDay, todayBA } from "@/lib/tz";
import { accentFor, stripes } from "@/lib/accent";
import { friendConnectionStates, type FriendConnectionState } from "@/lib/friends";
import { userProfilePath } from "@/lib/profile";
import { amenitiesFor } from "@/lib/amenities";
import { AmenityChips } from "@/components/amenity-chips";
import { Avatar } from "@/components/avatar";
import { DayOwnerControls } from "@/components/edit-day-form";
import {
  acceptFriendRequest,
  declineFriendRequest,
  removeAttendee,
  joinDay,
  leaveDay,
  sendFriendRequestFromDay,
} from "@/lib/actions";

type MapsPlace = {
  address: string;
  googlePlaceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

function googleMapsHref(place: MapsPlace) {
  const query =
    place.latitude != null && place.longitude != null
      ? `${place.latitude},${place.longitude}`
      : place.address.trim();
  if (!query) return null;

  const params = new URLSearchParams({ api: "1", query });
  if (place.googlePlaceId) params.set("query_place_id", place.googlePlaceId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function AttendeeFriendControl({
  dayId,
  attendeeId,
  canRequest,
  state,
}: {
  dayId: string;
  attendeeId: string;
  canRequest: boolean;
  state: FriendConnectionState;
}) {
  if (!canRequest || state.kind === "self") return null;

  if (state.kind === "friends") {
    return <span className="amenity bg-olive/10 text-olive">amigo</span>;
  }

  if (state.kind === "outgoing_pending") {
    return <span className="amenity">pedido enviado</span>;
  }

  if (state.kind === "incoming_pending") {
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <form action={acceptFriendRequest}>
          <input type="hidden" name="requestId" value={state.requestId} />
          <button className="rounded-full bg-olive px-2.5 py-1 font-mono text-[11px] font-medium text-on-action">
            aceptar
          </button>
        </form>
        <form action={declineFriendRequest}>
          <input type="hidden" name="requestId" value={state.requestId} />
          <button className="rounded-full border border-line px-2.5 py-1 font-mono text-[11px] font-medium text-faded hover:text-clay">
            rechazar
          </button>
        </form>
      </div>
    );
  }

  if (state.kind === "incoming_declined") {
    return <span className="amenity">rechazado</span>;
  }

  return (
    <form action={sendFriendRequestFromDay}>
      <input type="hidden" name="dayId" value={dayId} />
      <input type="hidden" name="recipientId" value={attendeeId} />
      <button className="rounded-full border border-clay/30 px-2.5 py-1 font-mono text-[11px] font-medium text-clay hover:bg-clay hover:text-on-action">
        sumar amigo
      </button>
    </form>
  );
}

function audienceLabel(circleName?: string | null) {
  return circleName ? `“${circleName}”` : "todos tus amigos";
}

function profileHref(profileUserId: string, viewerId: string) {
  return profileUserId === viewerId ? "/profile" : userProfilePath(profileUserId);
}

export default async function DayPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const userId = session.user.id;

  const { id } = await params;
  const day = await dayForUser(id, userId);
  if (!day) notFound(); // includes days outside your audience: no negative space

  const isHost = day.hostId === userId;
  const cancelled = day.status === "cancelled";
  const a = accentFor(day.hostId);
  const left = day.capacity - day.attendances.length;
  const placePhotos = day.place.photos;
  const primaryPhoto = placePhotos[0] ?? null;
  const description = day.description.trim();
  const mapsHref = googleMapsHref(day.place);
  const hasSetup = amenitiesFor(day.place.amenityKeys).length > 0;
  const isAttending = day.attendances.some((att) => att.user.id === userId);
  const canRequestAttendees = !isHost && isAttending;
  const selectedCircle = day.circle ?? day.rule?.circle ?? null;
  const attendeeIds = day.attendances.map((att) => att.user.id);
  // Ring only in this list — the rows are 32px tall and already carry a name, a
  // request control and a remove button. The number lives on the profile the
  // name links to.
  const [attendeeFriendStates, attendeesHosted] = await Promise.all([
    canRequestAttendees
      ? friendConnectionStates(userId, attendeeIds)
      : Promise.resolve(new Map<string, FriendConnectionState>()),
    hostedJuntadasFor(attendeeIds),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Banner */}
      <div
        className="relative -mx-5 -mt-6 h-52 overflow-hidden sm:-mx-6 md:-mx-11 md:-mt-10 md:rounded-b-[26px]"
        style={{ background: stripes(a, 22) }}
      >
        {primaryPhoto ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primaryPhoto.url}
              alt={`Foto de ${day.place.nickname}`}
              className="h-full w-full object-cover"
            />
          </>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center font-mono text-[12px] opacity-70"
            style={{ color: a.accent }}
          >
            [ foto de la casa ]
          </div>
        )}
        {/* Untokenised on purpose: a photograph is dark in both themes, so its
            scrim is already correct at night and must not follow --color-ink,
            which inverts to near-white and would erase the title below. */}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(28,20,14,0.55)] to-transparent to-55%" />
        <Link
          href="/juntadas"
          aria-label="Volver"
          className="absolute top-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-paper/90 text-ink shadow-md"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="absolute inset-x-5 bottom-4 text-on-scrim">
          <h1 className="font-display text-2xl leading-tight font-bold">{day.place.nickname}</h1>
          {mapsHref ? (
            <a
              href={mapsHref}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-block text-sm opacity-90 underline-offset-4 hover:underline"
            >
              {day.place.address || "Buenos Aires"}
            </a>
          ) : (
            <p className="mt-0.5 text-sm opacity-90">{day.place.address || "Buenos Aires"}</p>
          )}
        </div>
      </div>

      <div className="mt-5">
        {cancelled && (
          <div className="mb-4 rounded-2xl border border-clay/40 bg-clay/5 px-4 py-3 text-sm text-clay">
            <p className="font-semibold">Esta juntada fue cancelada.</p>
            {day.cancellationReason && (
              <p className="mt-1 leading-relaxed">“{day.cancellationReason}”</p>
            )}
          </div>
        )}

        {/* Host + when */}
        <div
          className={`panel relative flex flex-wrap items-center gap-3 p-3 ${
            isHost && !cancelled ? "pr-24" : ""
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar name={day.host.name} image={day.host.image} size={40} />
            <div className="min-w-0">
              <Link
                href={profileHref(day.host.id, userId)}
                className="profile-link inline-block max-w-full rounded-md outline-none hover:text-clay focus-visible:ring-2 focus-visible:ring-clay/60"
              >
                <span data-profile-label className="block truncate text-sm font-semibold text-ink">
                  {isHost ? "Vos" : day.host.name}
                </span>
              </Link>
              <div className="font-mono text-[12px] text-faded">anfitrión</div>
            </div>
          </div>
          <div className="text-right font-mono text-[12px] text-ink">
            <div>
              {formatDay(day.date)} · {day.startTime}–{day.endTime}
            </div>
            {isHost && (
              <div className="mt-1 text-[11px] text-faded">
                Para {audienceLabel(selectedCircle?.name)}
              </div>
            )}
          </div>
          {isHost && !cancelled && (
            <DayOwnerControls
              day={{
                id: day.id,
                date: day.date,
                startTime: day.startTime,
                endTime: day.endTime,
                description: day.description,
              }}
              minDate={todayBA()}
              formClassName="basis-full border-t border-line pt-3"
              successClassName="basis-full rounded-xl bg-olive/10 px-3 py-2 text-sm font-bold text-olive"
            />
          )}
        </div>

        {description && (
          <section className="mt-4 rounded-[18px] bg-amenity px-4 py-3">
            <p className="label">Mood de la juntada</p>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
              {description}
            </p>
          </section>
        )}

        {/* Who's coming */}
        <div className="mt-6 mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Quiénes van</h2>
          <span className="font-mono text-[12px]" style={{ color: a.accent }}>
            {left > 0 ? `${left} ${left === 1 ? "lugar libre" : "lugares libres"}` : "completo"}
          </span>
        </div>
        {day.attendances.length === 0 ? (
          <p className="text-sm text-faded">Nadie todavía — sé el primero.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {day.attendances.map((att) => (
              <li key={att.user.id} className="panel flex flex-wrap items-center gap-3 p-2.5 sm:flex-nowrap">
                <Link
                  href={profileHref(att.user.id, userId)}
                  className="profile-link flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none hover:text-clay focus-visible:ring-2 focus-visible:ring-clay/60"
                >
                  <Avatar
                    name={att.user.name}
                    image={att.user.image}
                    size={32}
                    hosts={(attendeesHosted.get(att.user.id) ?? 0) > 0}
                  />
                  <div className="min-w-0 text-sm font-medium text-ink">
                    <span data-profile-label className="block truncate">{att.user.name}</span>
                    {att.user.id === userId && (
                      <span className="font-mono text-[11px]" style={{ color: a.accent }}>
                        vos
                      </span>
                    )}
                  </div>
                </Link>
                <AttendeeFriendControl
                  dayId={day.id}
                  attendeeId={att.user.id}
                  canRequest={canRequestAttendees}
                  state={attendeeFriendStates.get(att.user.id) ?? { kind: "none" }}
                />
                {isHost && att.user.id !== userId && (
                  <form action={removeAttendee}>
                    <input type="hidden" name="dayId" value={day.id} />
                    <input type="hidden" name="userId" value={att.user.id} />
                    <button className="font-mono text-[11px] text-faded hover:text-clay">quitar</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* The house */}
        <div className="card mt-6 p-4">
          <h3 className="mb-2 font-display text-base font-semibold text-ink">La casa</h3>
          {placePhotos.length > 1 && (
            <div className="mb-4 grid grid-cols-2 gap-2">
              {placePhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className={`overflow-hidden rounded-2xl bg-paper ${
                    index === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={`Foto ${index + 1} de ${day.place.nickname}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
          <div className="space-y-3 text-sm">
            <div>
              <p className="label">Dirección</p>
              {mapsHref ? (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-ink underline decoration-clay/35 underline-offset-4 transition-colors hover:text-clay"
                >
                  {day.place.address || "Preguntale al anfitrión"}
                </a>
              ) : (
                <p className="text-ink">{day.place.address || "Preguntale al anfitrión"}</p>
              )}
            </div>
            {hasSetup && (
              <div>
                <p className="label">El setup</p>
                <AmenityChips keys={day.place.amenityKeys} />
              </div>
            )}
            {day.place.arrivalNotes && (
              <div>
                <p className="label">Cómo llegar</p>
                <p className="whitespace-pre-wrap text-ink">{day.place.arrivalNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {!cancelled && !isHost && (
          <div className="mt-6">
            {day.attendances.some((att) => att.user.id === userId) ? (
              <form action={leaveDay}>
                <input type="hidden" name="dayId" value={day.id} />
                <button
                  className="w-full rounded-2xl py-3.5 text-base font-semibold transition-transform active:scale-[0.99]"
                  style={{ color: a.accent, boxShadow: `inset 0 0 0 1.5px ${a.accent}` }}
                >
                  ✓ Vas — tocá para bajarte
                </button>
              </form>
            ) : left <= 0 ? (
              <div className="w-full rounded-2xl bg-disabled py-3.5 text-center text-base font-semibold text-faded">
                Completo
              </div>
            ) : (
              <form action={joinDay}>
                <input type="hidden" name="dayId" value={day.id} />
                <button
                  className="w-full rounded-2xl py-3.5 text-base font-semibold text-on-action transition-transform active:scale-[0.99]"
                  style={{ backgroundColor: a.accent, boxShadow: `0 12px 24px -12px ${a.accent}` }}
                >
                  Sumarme
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
