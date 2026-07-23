import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { dayForUser } from "@/lib/queries";
import { formatDay } from "@/lib/tz";
import { accentFor, stripes } from "@/lib/accent";
import { Avatar } from "@/components/avatar";
import { cancelDay, removeAttendee, joinDay, leaveDay } from "@/lib/actions";

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
  const amenities = (day.place.amenities ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

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
        <div className="absolute inset-x-5 bottom-4 text-white">
          <h1 className="font-display text-2xl leading-tight font-bold">{day.place.nickname}</h1>
          <p className="mt-0.5 text-sm opacity-90">{day.place.address || "Buenos Aires"}</p>
        </div>
      </div>

      <div className="mt-5">
        {cancelled && (
          <div className="mb-4 rounded-2xl border border-clay/40 bg-clay/5 px-4 py-3 text-sm font-semibold text-clay">
            Esta juntada fue cancelada.
          </div>
        )}

        {/* Host + when */}
        <div className="panel flex items-center gap-3 p-3">
          <Avatar name={day.host.name} image={day.host.image} size={40} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink">
              {isHost ? "Vos" : day.host.name}
            </div>
            <div className="font-mono text-[12px] text-faded">anfitrión</div>
          </div>
          <div className="text-right font-mono text-[12px] text-ink">
            {formatDay(day.date)} · {day.startTime}–{day.endTime}
          </div>
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
              <li key={att.user.id} className="panel flex items-center gap-3 p-2.5">
                <Avatar name={att.user.name} image={att.user.image} size={32} />
                <span className="flex-1 text-sm font-medium text-ink">
                  {att.user.name}
                  {att.user.id === userId && (
                    <span className="ml-1 font-mono text-[11px]" style={{ color: a.accent }}>
                      vos
                    </span>
                  )}
                </span>
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
              <p className="text-ink">{day.place.address || "Preguntale al anfitrión"}</p>
            </div>
            {amenities.length > 0 && (
              <div>
                <p className="label">El setup</p>
                <div className="flex flex-wrap gap-1.5">
                  {amenities.map((am, i) => (
                    <span key={i} className="amenity">
                      {am}
                    </span>
                  ))}
                </div>
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
              <div className="w-full rounded-2xl bg-[oklch(0.92_0.005_70)] py-3.5 text-center text-base font-semibold text-faded">
                Completo
              </div>
            ) : (
              <form action={joinDay}>
                <input type="hidden" name="dayId" value={day.id} />
                <button
                  className="w-full rounded-2xl py-3.5 text-base font-semibold text-white transition-transform active:scale-[0.99]"
                  style={{ backgroundColor: a.accent, boxShadow: `0 12px 24px -12px ${a.accent}` }}
                >
                  Sumarme
                </button>
              </form>
            )}
          </div>
        )}
        {isHost && !cancelled && (
          <form action={cancelDay} className="mt-6">
            <input type="hidden" name="dayId" value={day.id} />
            <button className="btn-danger w-full">Cancelar esta juntada</button>
          </form>
        )}
      </div>
    </div>
  );
}
