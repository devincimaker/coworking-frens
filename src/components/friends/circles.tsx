"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Avatar, AvatarStack } from "@/components/avatar";
import { createCircle, deleteCircle, toggleCircleMember } from "@/lib/actions";
import { CIRCLE_NAME_MAX, CREATE_CIRCLE_INITIAL } from "@/lib/circles";

export type CircleFriend = { id: string; name: string | null; image: string | null };
export type CircleSummary = { id: string; name: string; members: CircleFriend[] };

// Four faces then a count: enough to recognise a circle at a glance without the
// row growing taller than the two lines of text beside it.
const FACES = 4;
// Chips shown before the rest fold away. Someone with fifty friends should not
// have to scroll a wall of names to see who is already in.
const CHIPS = 8;

function firstName(person: CircleFriend) {
  return person.name?.trim().split(" ")[0] || "Fren";
}

/**
 * Members first, then everyone else. Editing a circle is mostly reading it, so
 * the answer to "who is in this?" has to be at the top of the list and not
 * scattered through it alphabetically.
 */
function useRoster(friends: CircleFriend[], startsIn: (friend: CircleFriend) => boolean) {
  const [expanded, setExpanded] = useState(false);
  // Frozen at open, not re-sorted on every tick: a chip that jumps to the front
  // the instant you choose it slides the next one under your cursor.
  const [ordered] = useState(() =>
    [...friends].sort((a, b) => Number(startsIn(b)) - Number(startsIn(a)))
  );
  const visible = expanded ? ordered : ordered.slice(0, CHIPS);
  return { visible, hidden: ordered.length - visible.length, expanded, setExpanded };
}

function MoreChip({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="member-chip member-chip-off px-3.5 font-mono text-[11.5px] font-medium"
    >
      +{count} más
    </button>
  );
}

function MemberChip({ friend, inCircle }: { friend: CircleFriend; inCircle: boolean }) {
  return (
    <>
      <Avatar name={friend.name} image={friend.image} size={22} />
      <span aria-hidden="true">{inCircle ? "✓" : "+"}</span>
      {firstName(friend)}
      <span className="sr-only">{inCircle ? " — sacar del círculo" : " — sumar al círculo"}</span>
    </>
  );
}

function CircleEditor({
  circle,
  friends,
  onDone,
}: {
  circle: CircleSummary;
  friends: CircleFriend[];
  onDone: () => void;
}) {
  const memberIds = new Set(circle.members.map((member) => member.id));
  // Two questions that both end in "borrar", asked from opposite directions:
  // the plain one from the delete button, and the one that only comes up when
  // removing someone would leave the circle with nobody in it.
  const [confirming, setConfirming] = useState<{ lastMember: CircleFriend | null } | null>(null);
  const isLast = (friend: CircleFriend) => memberIds.size === 1 && memberIds.has(friend.id);
  const roster = useRoster(friends, (friend) => memberIds.has(friend.id));
  const panelRef = useRef<HTMLDivElement>(null);

  // The Editar button that opened this is gone, so focus would otherwise fall
  // back to the top of the document.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div ref={panelRef} tabIndex={-1} className="panel p-4 outline-none">
      <div className="flex items-center gap-2.5">
        <h3 className="min-w-0 truncate font-display text-lg font-semibold text-ink">
          “{circle.name}”
        </h3>
        <span className="shrink-0 font-mono text-[11.5px] text-faded">
          {memberIds.size} de {friends.length}
        </span>
        <button
          type="button"
          onClick={onDone}
          className="ml-auto shrink-0 cursor-pointer text-[13.5px] font-semibold text-clay"
        >
          Listo
        </button>
      </div>

      <p className="label mt-4">Quién está adentro</p>
      <div className="flex flex-wrap gap-2">
        {roster.visible.map((friend) => {
          const inCircle = memberIds.has(friend.id);
          const chipClass = `member-chip ${inCircle ? "member-chip-on" : "member-chip-off"}`;

          // Removing the last member is not a toggle, it is a deletion, so that
          // chip asks instead of submitting.
          if (isLast(friend)) {
            return (
              <button
                key={friend.id}
                type="button"
                aria-pressed
                onClick={() => setConfirming({ lastMember: friend })}
                className={chipClass}
              >
                <MemberChip friend={friend} inCircle />
              </button>
            );
          }

          return (
            <form key={friend.id} action={toggleCircleMember}>
              <input type="hidden" name="circleId" value={circle.id} />
              <input type="hidden" name="friendId" value={friend.id} />
              <button aria-pressed={inCircle} className={chipClass}>
                <MemberChip friend={friend} inCircle={inCircle} />
              </button>
            </form>
          );
        })}
        {roster.hidden > 0 && (
          <MoreChip count={roster.hidden} onClick={() => roster.setExpanded(true)} />
        )}
      </div>

      {confirming ? (
        <div className="mt-4 flex flex-wrap items-center gap-3.5 rounded-2xl border border-coral-200 bg-coral-100 p-3.5">
          <p className="min-w-[14rem] flex-1 text-[13.5px] leading-relaxed text-ink">
            {confirming.lastMember
              ? `Si sacás a ${firstName(confirming.lastMember)}, el círculo queda vacío y no le sirve a nadie. ¿Lo borrás?`
              : "Si lo borrás, los días fijos que apuntaban a este círculo se desactivan — no pasan a todos tus amigos. ¿Lo borrás?"}
          </p>
          <form action={deleteCircle} className="shrink-0">
            <input type="hidden" name="circleId" value={circle.id} />
            <button className="cursor-pointer rounded-xl border border-coral-200 px-3.5 py-2 text-[13.5px] font-semibold text-coral-600">
              Borrar círculo
            </button>
          </form>
          <button
            type="button"
            onClick={() => setConfirming(null)}
            className="shrink-0 cursor-pointer text-[13.5px] font-semibold text-faded hover:text-ink"
          >
            Dejarlo así
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3.5 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => setConfirming({ lastMember: null })}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-coral-200 px-3.5 py-2 text-[13.5px] font-semibold text-coral-600"
          >
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
            Borrar círculo
          </button>
          <p className="min-w-[14rem] flex-1 text-[12.5px] leading-relaxed text-faded">
            Si lo borrás, los días fijos que apuntaban a este círculo se desactivan — no pasan a
            todos tus amigos.
          </p>
        </div>
      )}
    </div>
  );
}

function NewCircleForm({ friends, onDone }: { friends: CircleFriend[]; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(createCircle, CREATE_CIRCLE_INITIAL);
  const [picked, setPicked] = useState<string[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);
  const roster = useRoster(friends, (friend) => picked.includes(friend.id));

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    if (state.created) onDone();
  }, [state, onDone]);

  const toggle = (id: string) =>
    setPicked((was) => (was.includes(id) ? was.filter((x) => x !== id) : [...was, id]));

  return (
    <form action={formAction} className="panel p-4">
      {picked.map((id) => (
        <input key={id} type="hidden" name="memberIds" value={id} />
      ))}

      <label htmlFor="circle-name" className="label">
        Nombre
      </label>
      <input
        id="circle-name"
        ref={nameRef}
        name="name"
        required
        maxLength={CIRCLE_NAME_MAX}
        placeholder="los del deep work"
        className="input"
      />

      <p className="label mt-4">
        Quién entra{" "}
        <span className={picked.length > 0 ? "text-clay normal-case" : "normal-case"}>
          {picked.length > 0 ? `${picked.length} elegidos` : "nadie todavía"}
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        {roster.visible.map((friend) => {
          const inCircle = picked.includes(friend.id);
          return (
            <button
              key={friend.id}
              type="button"
              aria-pressed={inCircle}
              onClick={() => toggle(friend.id)}
              className={`member-chip ${inCircle ? "member-chip-on" : "member-chip-off"}`}
            >
              <MemberChip friend={friend} inCircle={inCircle} />
            </button>
          );
        })}
        {roster.hidden > 0 && (
          <MoreChip count={roster.hidden} onClick={() => roster.setExpanded(true)} />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button disabled={picked.length === 0 || pending} className="btn-primary shrink-0">
          {picked.length > 0 ? `Crear con ${picked.length}` : "Crear"}
        </button>
        <button type="button" onClick={onDone} className="btn-ghost shrink-0">
          Cancelar
        </button>
        <p
          className={`min-w-[13rem] flex-1 text-[13px] leading-relaxed ${
            state.error ? "text-danger" : "text-faded"
          }`}
          role={state.error ? "alert" : undefined}
        >
          {state.error ??
            (picked.length > 0
              ? "Podés seguir sumando después. Nunca queda vacío."
              : "Un círculo es la gente, no el nombre: elegí al menos a una persona.")}
        </p>
      </div>
    </form>
  );
}

export function Circles({
  circles,
  friends,
}: {
  circles: CircleSummary[];
  friends: CircleFriend[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        {/* No count: nobody has enough circles for the number to tell them
            anything they cannot see by looking. */}
        <p className="eyebrow">Círculos</p>
        {friends.length > 0 && !creating && (
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditing(null);
            }}
            className="shrink-0 cursor-pointer text-[13.5px] font-semibold text-clay"
          >
            Nuevo círculo
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {/* Directly under the button that opened it. Pushed below the existing
            circles it would appear off-screen for anyone with a few, and its
            Cancelar would sit nowhere near the Nuevo círculo it undoes. */}
        {creating && <NewCircleForm friends={friends} onDone={() => setCreating(false)} />}

        {circles.map((circle) =>
          editing === circle.id ? (
            <CircleEditor
              key={circle.id}
              circle={circle}
              friends={friends}
              onDone={() => setEditing(null)}
            />
          ) : (
            <div key={circle.id} className="circle-row p-3.5">
              <div className="flex items-center gap-2.5">
                <span className="min-w-0 truncate font-display text-[17px] font-bold text-ink">
                  {circle.name}
                </span>
                <span className="shrink-0 font-mono text-[11.5px] text-faded">
                  {circle.members.length === 1 ? "1 persona" : `${circle.members.length} personas`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(circle.id);
                    setCreating(false);
                  }}
                  className="ml-auto shrink-0 cursor-pointer text-[13.5px] font-semibold text-clay"
                >
                  Editar
                </button>
              </div>
              {circle.members.length > 0 && (
                <div className="mt-3">
                  <AvatarStack users={circle.members} size={28} max={FACES} />
                </div>
              )}
            </div>
          )
        )}

        {circles.length === 0 && !creating && (
          <p className="text-sm text-faded">
            {friends.length === 0
              ? "Los círculos son grupos privados de tus amigos, para cuando un día no es para todos. Primero sumá amigos."
              : "Todavía no tenés círculos. Son grupos privados de tus amigos, para cuando un día no es para todos — nadie ve los tuyos."}
          </p>
        )}
      </div>
    </section>
  );
}
