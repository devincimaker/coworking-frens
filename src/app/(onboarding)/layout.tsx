import { AuthShell } from "@/components/auth-shell";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell width="lg">{children}</AuthShell>;
}
