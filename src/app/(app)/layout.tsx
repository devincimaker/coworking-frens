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
      <div className="flex min-h-dvh justify-center bg-[radial-gradient(120%_90%_at_50%_-10%,#f1e9dc_0%,#e7dcca_60%,#ddd0bb_100%)]">
        <div className="flex w-full max-w-[1280px] bg-paper shadow-[0_0_90px_rgba(60,40,20,0.14)]">
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
