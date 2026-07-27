import { AuthShell } from "@/components/auth-shell";
import { FeedbackWidget } from "@/components/feedback-widget";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthShell width="lg">{children}</AuthShell>
      <FeedbackWidget />
    </>
  );
}
