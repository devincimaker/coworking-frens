import Link from "next/link";
import { Avatar, AvatarStack } from "@/components/avatar";
import type { MutualFriend } from "@/lib/friends";
import { userProfilePath } from "@/lib/profile";

// Faces shown before the list collapses into a count; also the point past which
// the profile summary stops naming everyone.
const FACES = 3;
const NAMES_INLINE = 2;

function shortName(person: MutualFriend) {
  const first = person.name?.trim().split(" ")[0];
  return first || (person.username ? `@${person.username}` : "un amigo");
}

function summarize(people: MutualFriend[]) {
  const names = people.map(shortName);
  if (names.length === 1) return names[0];
  if (names.length <= FACES) {
    return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
  }
  return `${names.slice(0, NAMES_INLINE).join(", ")} y ${names.length - NAMES_INLINE} más`;
}

// Faces carry no information a screen reader can use, and the names are already
// in the text beside them.
function Faces({ people, size }: { people: MutualFriend[]; size: number }) {
  return (
    <div aria-hidden="true" className="shrink-0">
      <AvatarStack users={people.slice(0, FACES)} size={size} />
    </div>
  );
}

// Dense surfaces: a count, with the names one tap away on the profile.
export function MutualFriendsCount({ people }: { people: MutualFriend[] }) {
  if (people.length === 0) return null;

  return (
    <div className="mt-1.5 flex items-center gap-2">
      <Faces people={people} size={20} />
      <span className="truncate font-mono text-[11px] text-faded">
        {people.length} {people.length === 1 ? "amigo" : "amigos"} en común
      </span>
    </div>
  );
}

export function MutualFriendsPanel({ people }: { people: MutualFriend[] }) {
  if (people.length === 0) return null;
  const line = summarize(people);

  return (
    <section className="mt-5">
      <h2 className="eyebrow mb-2">Amigos en común</h2>
      {people.length <= FACES ? (
        <div className="flex items-center gap-2.5">
          <Faces people={people} size={26} />
          <p className="min-w-0 truncate text-sm text-ink">{line}</p>
        </div>
      ) : (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-clay/60 [&::-webkit-details-marker]:hidden">
            <Faces people={people} size={26} />
            <span className="min-w-0 truncate text-sm text-ink">{line}</span>
            <span
              aria-hidden="true"
              className="shrink-0 font-mono text-[12px] text-faded transition-transform group-open:rotate-90"
            >
              ›
            </span>
          </summary>
          <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2">
            {people.map((person) => (
              <li key={person.id}>
                <Link
                  href={userProfilePath(person.id)}
                  className="profile-link flex items-center gap-2.5 rounded-xl py-1.5 outline-none hover:text-clay focus-visible:ring-2 focus-visible:ring-clay/60"
                >
                  <Avatar name={person.name} image={person.image} size={30} />
                  <div className="min-w-0">
                    <p data-profile-label className="truncate text-sm font-medium text-ink">
                      {person.name ?? person.username ?? "Fren"}
                    </p>
                    {person.name && person.username && (
                      <p data-profile-label className="truncate font-mono text-[11px] text-faded">
                        @{person.username}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
