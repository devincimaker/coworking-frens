import { ThemeToggle } from "@/components/theme-toggle";

export function AuthShell({
  children,
  width = "md",
}: {
  children: React.ReactNode;
  width?: "md" | "lg";
}) {
  const widthClass = width === "lg" ? "max-w-lg" : "max-w-md";

  return (
    <div className="shell-wash relative flex min-h-dvh justify-center px-4 py-10">
      {/* Signing in and onboarding happen before there is any nav to hang the
          switch off, and they are the first thing a new fren ever sees. */}
      <ThemeToggle className="absolute top-4 right-4" />
      <main className={`w-full ${widthClass}`}>{children}</main>
    </div>
  );
}
