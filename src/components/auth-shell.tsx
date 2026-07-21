export function AuthShell({
  children,
  width = "md",
}: {
  children: React.ReactNode;
  width?: "md" | "lg";
}) {
  const widthClass = width === "lg" ? "max-w-lg" : "max-w-md";

  return (
    <div className="flex min-h-dvh justify-center bg-[radial-gradient(120%_90%_at_50%_-10%,#f1e9dc_0%,#e7dcca_60%,#ddd0bb_100%)] px-4 py-10">
      <main className={`w-full ${widthClass}`}>{children}</main>
    </div>
  );
}
