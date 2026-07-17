import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { friendsOf } from "@/lib/friends";
import { circlesOf } from "@/lib/queries";
import { appUrl } from "@/lib/url";
import { Avatar } from "@/components/avatar";
import { CopyButton } from "@/components/copy-button";
import { createCircle, deleteCircle, toggleCircleMember } from "@/lib/actions";

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const [friends, circles] = await Promise.all([friendsOf(user.id), circlesOf(user.id)]);
  const inviteUrl = `${appUrl()}/invite/${user.inviteToken}`;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="section-title">Bring a fren in</h1>
        <div className="card mt-3 flex flex-wrap items-center gap-3">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-paper px-3 py-2 text-xs">
            {inviteUrl}
          </code>
          <CopyButton text={inviteUrl} />
        </div>
        <p className="mt-2 text-xs text-faded">
          Anyone who opens this link and signs in becomes your friend. Friendship is always mutual.
        </p>
      </section>

      <section>
        <h2 className="section-title">
          Friends <span className="text-faded">({friends.length})</span>
        </h2>
        {friends.length === 0 ? (
          <p className="mt-2 text-sm text-faded">
            No friends yet — send someone your invite link above.
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {friends.map((f) => (
              <li key={f.id} className="card flex items-center gap-3 py-3">
                <Avatar name={f.name} image={f.image} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{f.name}</p>
                  <p className="truncate text-xs text-faded">{f.email}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="section-title">Circles</h2>
        <p className="mt-1 text-sm text-faded">
          Private groupings of your friends, for when a day isn&apos;t for everyone. Nobody sees
          your circles but you.
        </p>
        <div className="mt-3 space-y-3">
          {circles.map((circle) => {
            const memberIds = new Set(circle.members.map((m) => m.user.id));
            return (
              <div key={circle.id} className="card">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold">“{circle.name}”</h3>
                  <form action={deleteCircle}>
                    <input type="hidden" name="circleId" value={circle.id} />
                    <button className="text-xs font-bold text-faded hover:text-clay">
                      delete
                    </button>
                  </form>
                </div>
                {friends.length === 0 ? (
                  <p className="mt-2 text-sm text-faded">Add friends first.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {friends.map((f) => {
                      const inCircle = memberIds.has(f.id);
                      return (
                        <form key={f.id} action={toggleCircleMember}>
                          <input type="hidden" name="circleId" value={circle.id} />
                          <input type="hidden" name="friendId" value={f.id} />
                          <button
                            className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-bold transition-colors ${
                              inCircle
                                ? "border-olive bg-olive text-paper"
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

          <form action={createCircle} className="card flex items-center gap-2 py-4">
            <input
              name="name"
              placeholder="New circle, e.g. “deep work crew”"
              required
              className="input flex-1"
            />
            <button className="btn-ghost">Create</button>
          </form>
        </div>
      </section>
    </div>
  );
}
