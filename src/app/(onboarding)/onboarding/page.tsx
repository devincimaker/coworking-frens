import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOnboardingComplete, suggestedUsername } from "@/lib/profile";
import { OnboardingForm } from "./onboarding-form";

function safePath(raw?: string) {
  return raw?.startsWith("/") && !raw.startsWith("//") ? raw : "/juntadas";
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const destination = safePath(callbackUrl);
  const session = await auth();

  if (!session?.user?.id) {
    const onboardingPath =
      destination === "/juntadas"
        ? "/onboarding"
        : `/onboarding?callbackUrl=${encodeURIComponent(destination)}`;
    redirect(`/signin?callbackUrl=${encodeURIComponent(onboardingPath)}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      username: true,
      email: true,
      image: true,
      bio: true,
      onboardedAt: true,
    },
  });

  if (!user) redirect("/signin");
  if (isOnboardingComplete(user)) redirect(destination);

  return (
    <div className="pt-8">
      <div className="mb-5 flex items-center justify-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay font-display text-xl font-bold text-white">
          F
        </span>
        <span className="font-display text-3xl font-bold tracking-tight text-ink">Frens</span>
      </div>

      <OnboardingForm
        user={{
          ...user,
          username: user.username ?? suggestedUsername(user.email, user.name),
        }}
        callbackUrl={destination}
      />
    </div>
  );
}
