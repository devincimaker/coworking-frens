import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signOutToHome } from "@/lib/auth-actions";
import { prisma } from "@/lib/prisma";
import { TERMS_PATH } from "@/lib/terms";
import { formatTimestamp } from "@/lib/tz";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      username: true,
      email: true,
      image: true,
      bio: true,
      termsAcceptedAt: true,
      termsVersion: true,
    },
  });
  if (!user) redirect("/signin"); // stale session: the signed-in id no longer exists

  return (
    <div>
      <h1 className="page-title">Tu perfil</h1>
      <p className="mt-2 mb-7 text-[15px] text-faded">Así te ven tus amigos en las juntadas.</p>

      <ProfileForm user={user} />

      {user.termsAcceptedAt && (
        <p className="mt-6 text-[13px] leading-6 text-faded">
          Aceptaste los{" "}
          <Link href={TERMS_PATH} className="font-semibold text-clay underline">
            Términos y Condiciones
          </Link>{" "}
          {user.termsVersion ? `(v${user.termsVersion}) ` : ""}
          el {formatTimestamp(user.termsAcceptedAt)}.
        </p>
      )}

      <form
        action={signOutToHome}
        className="mt-6"
      >
        <button className="btn-ghost">Cerrar sesión</button>
      </form>
    </div>
  );
}
