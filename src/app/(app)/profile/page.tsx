import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, username: true, email: true, image: true, bio: true },
  });
  if (!user) redirect("/signin"); // stale session: the signed-in id no longer exists

  return (
    <div>
      <h1 className="page-title">Tu perfil</h1>
      <p className="mt-2 mb-7 text-[15px] text-faded">Así te ven tus amigos en las juntadas.</p>

      <ProfileForm user={user} />

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/signin" });
        }}
        className="mt-6"
      >
        <button className="btn-ghost">Cerrar sesión</button>
      </form>
    </div>
  );
}
