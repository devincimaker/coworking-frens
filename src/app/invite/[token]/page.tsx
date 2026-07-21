import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { areFriends } from "@/lib/friends";
import { Avatar } from "@/components/avatar";
import { acceptInvite } from "@/lib/actions";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/signin?callbackUrl=/invite/${token}`);

  const inviter = await prisma.user.findUnique({ where: { inviteToken: token } });
  if (!inviter) notFound();
  if (inviter.id === session.user.id) redirect("/friends");
  const alreadyFriends = await areFriends(session.user.id, inviter.id);

  return (
    <div className="mt-16 text-center">
      <div className="flex justify-center">
        <Avatar name={inviter.name} image={inviter.image} size={72} />
      </div>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink">
        {inviter.name} {alreadyFriends ? "ya es tu amigo" : "quiere ser tu amigo"}
      </h1>
      <p className="mt-2 text-sm text-faded">
        Los amigos ven las juntadas del otro y pueden sumarse a una silla.
      </p>
      {alreadyFriends ? (
        <Link href="/" className="btn-ghost mt-6">
          Volver a las juntadas
        </Link>
      ) : (
        <form action={acceptInvite} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <button className="btn-primary px-6 py-3">Aceptar — a laburar juntos</button>
        </form>
      )}
    </div>
  );
}
