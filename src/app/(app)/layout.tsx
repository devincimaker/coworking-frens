import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar, BottomNav, MobileTopBar } from "@/components/nav";
import { FeedbackWidget } from "@/components/feedback-widget";
import { signOutToHome } from "@/lib/auth-actions";
import { isFeedbackAdminEmail } from "@/lib/admin";
import { isOnboardingComplete } from "@/lib/profile";
import { hasAcceptedCurrentTerms, TERMS_ACCEPT_PATH } from "@/lib/terms";
import { prisma } from "@/lib/prisma";
import { unseenIncomingFriendRequestCount } from "@/lib/friends";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      image: true,
      bio: true,
      onboardedAt: true,
      termsAcceptedAt: true,
      termsVersion: true,
    },
  });

  if (!user) redirect("/signin");
  if (!isOnboardingComplete(user)) redirect("/onboarding");
  if (!hasAcceptedCurrentTerms(user)) redirect(TERMS_ACCEPT_PATH);
  const showFeedbackAdmin = isFeedbackAdminEmail(user.email);
  const unseenFriendRequestCount = await unseenIncomingFriendRequestCount(user.id);

  return (
    <>
      <div className="shell-wash flex min-h-dvh justify-center">
        <div className="flex w-full max-w-[1280px] bg-paper shadow-shell">
          <Sidebar
            user={user}
            signOutAction={signOutToHome}
            showFeedbackAdmin={showFeedbackAdmin}
            unseenFriendRequestCount={unseenFriendRequestCount}
          />
          <main className="min-w-0 flex-1 pb-[calc(var(--bottom-nav-h)+4.5rem)] md:pb-0">
            <MobileTopBar user={user} />
            <div className="px-5 py-6 sm:px-6 md:px-11 md:py-10">{children}</div>
          </main>
        </div>
      </div>
      <BottomNav
        showFeedbackAdmin={showFeedbackAdmin}
        unseenFriendRequestCount={unseenFriendRequestCount}
      />
      <FeedbackWidget aboveBottomNav />
    </>
  );
}
