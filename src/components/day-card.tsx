import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { AUDIENCE_FRIENDS_OF_FRIENDS, audienceLabel } from "@/lib/audience";
import { accentFor, stripes } from "@/lib/accent";
import { AmenityChips } from "@/components/amenity-chips";
import { areaLabel } from "@/lib/place";
import { userProfilePath } from "@/lib/profile";
import { formatDay } from "@/lib/tz";
import { leaveDay } from "@/lib/actions";
import { JoinDayButton } from "@/components/join-day";

type Person = { id: string; name: string | null; image: string | null };

type DayWithRelations = {
  id: string;
  hostId: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  description: string;
  host: Person;
  place: {
    nickname: string;
    address?: string;
    addressNeighborhood?: string | null;
    addressCity?: string | null;
    addressRegion?: string | null;
    amenityKeys: string[];
    photos?: { id: string; url: string }[];
  };
  circle?: {
    id: string;
    name: string;
  } | null;
  audienceKind: string;
  attendances: { user: Person }[];
};

const firstName = (name: string | null | undefined) => name?.split(" ")[0] ?? "alguien";

function profileHref(profileUserId: string, viewerId: string) {
  return profileUserId === viewerId ? "/profile" : userProfilePath(profileUserId);
}

/**
 * `tone="neutral"` is for the host's own list, where a full day is the goal
 * rather than a closed door: it states the fact without the clay alarm.
 */
export function SpotsChip({
  taken,
  capacity,
  tone = "alert",
}: {
  taken: number;
  capacity: number;
  tone?: "alert" | "neutral";
}) {
  const left = capacity - taken;
  const full = left <= 0;
  const fullClass = tone === "neutral" ? "bg-amenity text-faded" : "bg-clay/12 text-clay";
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium ${
        full ? fullClass : "bg-olive/12 text-olive"
      }`}
    >
      {full ? "Completo" : `${left} ${left === 1 ? "lugar" : "lugares"}`}
    </span>
  );
}

export function JoinControls({ day, userId }: { day: DayWithRelations; userId: string }) {
  if (day.hostId === userId)
    return <span className="font-mono text-xs text-faded">Sos anfitrión</span>;
  const joined = day.attendances.some((a) => a.user.id === userId);
  const full = day.attendances.length >= day.capacity;
  if (joined)
    return (
      <form action={leaveDay}>
        <input type="hidden" name="dayId" value={day.id} />
        <button className="btn-ghost">Ya no voy</button>
      </form>
    );
  return (
    <JoinDayButton dayId={day.id} variant="feed" className="btn-primary" disabled={full}>
      {full ? "Completo" : "Sumarme"}
    </JoinDayButton>
  );
}

/** Accent-tinted join button used inside the juntada card's "quiénes van" panel. */
function FeedJoinButton({
  day,
  joined,
  full,
  accent,
}: {
  day: DayWithRelations;
  joined: boolean;
  full: boolean;
  accent: string;
}) {
  if (joined)
    return (
      <form action={leaveDay} className="mt-3">
        <input type="hidden" name="dayId" value={day.id} />
        <button
          className="w-full rounded-[13px] py-2.5 text-sm font-semibold transition-transform active:scale-[0.98]"
          style={{ color: accent, boxShadow: `inset 0 0 0 1.5px ${accent}` }}
        >
          ✓ Vas
        </button>
      </form>
    );
  if (full)
    return (
      <div className="mt-3 w-full rounded-[13px] bg-disabled py-2.5 text-center text-sm font-semibold text-faded">
        Completo
      </div>
    );
  return (
    <div className="mt-3">
      <JoinDayButton
        dayId={day.id}
        variant="feed"
        className="w-full rounded-[13px] py-2.5 text-sm font-semibold text-on-action transition-transform active:scale-[0.98]"
        style={{ backgroundColor: accent, boxShadow: `0 8px 16px -10px ${accent}` }}
      >
        Sumarme
      </JoinDayButton>
    </div>
  );
}

export function DayCard({ day, userId }: { day: DayWithRelations; userId: string }) {
  const attendees = day.attendances.map((a) => a.user);
  const isHost = day.hostId === userId;
  const joined = attendees.some((u) => u.id === userId);
  const full = attendees.length >= day.capacity;
  const a = accentFor(day.hostId);
  const hood = areaLabel(day.place);
  const primaryPhoto = day.place.photos?.[0] ?? null;
  const shown = attendees.slice(0, 4);
  const extra = attendees.length - shown.length;
  const description = day.description.trim();
  const hostLine = isHost
    ? `para ${audienceLabel(day.audienceKind, day.circle?.name, "todos tus amigos")}`
    : day.audienceKind === AUDIENCE_FRIENDS_OF_FRIENDS
      ? "anfitrión · abre a amigos de amigos"
      : "anfitrión";

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-3 px-1">
        <span className="font-display text-[17px] font-bold text-ink">{formatDay(day.date)}</span>
        <span className="font-mono text-sm text-faded">
          {day.startTime}–{day.endTime}
        </span>
      </div>

      <div className="card flex flex-col overflow-hidden md:flex-row">
        {/* DÓNDE — foto */}
        <Link
          href={`/day/${day.id}`}
          aria-label={`Ver ${day.place.nickname}`}
          className="relative block h-32 w-full shrink-0 md:h-auto md:w-[200px]"
          style={{ background: stripes(a) }}
        >
          {primaryPhoto ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={primaryPhoto.url}
                alt={`Foto de ${day.place.nickname}`}
                className="h-full w-full object-cover"
              />
              {day.place.photos && day.place.photos.length > 1 && (
                <span className="absolute right-2 bottom-2 rounded-full bg-scrim/70 px-2 py-1 font-mono text-[10px] font-semibold text-on-scrim backdrop-blur-sm">
                  {day.place.photos.length} fotos
                </span>
              )}
            </>
          ) : (
            <span
              className="absolute inset-0 flex items-center justify-center font-mono text-[11px] opacity-70"
              style={{ color: a.accent }}
            >
              [ foto ]
            </span>
          )}
        </Link>

        {/* DÓNDE — casa + anfitrión */}
        <div className="flex min-w-0 flex-1 flex-col p-5">
          <Link href={`/day/${day.id}`} className="font-display text-xl leading-tight font-bold text-ink hover:text-clay">
            {day.place.nickname}
          </Link>
          {hood && <div className="mt-0.5 text-[13px] text-faded">{hood}</div>}
          {description && (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/80">
              {description}
            </p>
          )}
          <div className="mt-4 flex items-center gap-2.5">
            <Avatar name={day.host.name} image={day.host.image} size={34} />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-ink">
                {isHost ? (
                  <>
                    Lo hosteás{" "}
                    <Link
                      href={profileHref(day.host.id, userId)}
                      className="profile-link inline-flex rounded-sm outline-none hover:text-clay focus-visible:ring-2 focus-visible:ring-clay/60"
                    >
                      <span data-profile-label>vos</span>
                    </Link>
                  </>
                ) : (
                  <>
                    Lo hostea{" "}
                    <Link
                      href={profileHref(day.host.id, userId)}
                      className="profile-link inline-flex rounded-sm outline-none hover:text-clay focus-visible:ring-2 focus-visible:ring-clay/60"
                    >
                      <span data-profile-label>{firstName(day.host.name)}</span>
                    </Link>
                  </>
                )}
              </div>
              <div className="font-mono text-[11px] text-faded">{hostLine}</div>
            </div>
          </div>
          <AmenityChips keys={day.place.amenityKeys} limit={4} className="mt-3.5" />
        </div>

        {/* QUIÉNES VAN */}
        <div className="flex flex-col border-t border-line p-4 md:w-[228px] md:border-t-0 md:border-l">
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="eyebrow">Quiénes van</span>
            <span className="font-mono text-xs font-medium" style={{ color: a.accent }}>
              {attendees.length}/{day.capacity}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            {attendees.length === 0 ? (
              <div className="text-[13px] text-faded">
                Nadie todavía.
                <br />
                Sé el primero.
              </div>
            ) : (
              <>
                {shown.map((u) => (
                  <Link
                    key={u.id}
                    href={profileHref(u.id, userId)}
                    className="profile-link flex items-center gap-2 rounded-lg outline-none hover:text-clay focus-visible:ring-2 focus-visible:ring-clay/60"
                  >
                    <Avatar name={u.name} image={u.image} size={26} />
                    <span data-profile-label className="truncate text-[13px] text-ink">
                      {u.id === userId ? "Vos" : firstName(u.name)}
                    </span>
                  </Link>
                ))}
                {extra > 0 && (
                  <Link
                    href={`/day/${day.id}`}
                    className="pl-[34px] text-xs font-semibold"
                    style={{ color: a.accent }}
                  >
                    +{extra} más
                  </Link>
                )}
              </>
            )}
          </div>
          {isHost ? (
            <Link
              href={`/day/${day.id}`}
              className="mt-3 w-full rounded-[13px] bg-amenity py-2.5 text-center text-sm font-semibold text-ink"
            >
              Ver juntada
            </Link>
          ) : (
            <FeedJoinButton day={day} joined={joined} full={full} accent={a.accent} />
          )}
        </div>
      </div>
    </div>
  );
}
