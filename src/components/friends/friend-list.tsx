"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import { HostTag } from "@/components/host-tag";
import { userProfilePath } from "@/lib/profile";

export type ListedFriend = {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  image: string | null;
  hosted: number;
};

// Accents are how these names are actually spelled and not how they are
// actually typed, so "tomas" has to find Tomás.
function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function handle(friend: ListedFriend) {
  return friend.username ?? friend.email.split("@")[0];
}

export function FriendList({ friends }: { friends: ListedFriend[] }) {
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const needle = fold(query.trim());
    if (!needle) return friends;
    return friends.filter(
      (friend) => fold(friend.name ?? "").includes(needle) || fold(handle(friend)).includes(needle)
    );
  }, [friends, query]);

  return (
    <section>
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3.5">
        <p className="eyebrow shrink-0">Todos · {friends.length}</p>
        {/* Worth its space from about a dozen people on — below that the list
            itself is the fastest way to find someone. */}
        {friends.length > 8 && (
          <div className="relative sm:max-w-[260px] sm:flex-1">
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faded"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="10.5" cy="10.5" r="5.7" />
              <path d="m15 15 4.5 4.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscá un amigo"
              aria-label="Buscá un amigo"
              className="input py-2 pl-9"
            />
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-faded">
          {friends.length === 0
            ? "Todavía no tenés amigos — mandá tu link con el botón Invitar."
            : `Ninguno de tus amigos se llama “${query.trim()}”.`}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {shown.map((friend) => (
            <Link
              key={friend.id}
              href={userProfilePath(friend.id)}
              className="profile-link panel flex items-center gap-3 p-3 outline-none transition-colors hover:border-clay/30 focus-visible:ring-2 focus-visible:ring-clay/60"
            >
              <Avatar
                name={friend.name}
                image={friend.image}
                size={38}
                hosts={friend.hosted > 0}
              />
              <div className="min-w-0">
                {/* The tag wraps under the name rather than squeezing it: two
                    per row leaves neither one readable at this width. */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p data-profile-label className="truncate text-[14.5px] font-semibold text-ink">
                    {friend.name}
                  </p>
                  <HostTag count={friend.hosted} />
                </div>
                <p data-profile-label className="truncate font-mono text-[11px] text-faded">
                  @{handle(friend)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
