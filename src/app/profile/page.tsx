import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true },
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="section-title">Profile</h1>
      </section>

      <ProfileForm user={user} />
    </div>
  );
}
