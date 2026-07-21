import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, DM_Mono } from "next/font/google";
import { auth, signOut } from "@/auth";
import { Sidebar, BottomNav, MobileTopBar } from "@/components/nav";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-bricolage",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "Coworking Frens",
  description: "Laburá en la casa de tus amigos",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const fontVars = `${bricolage.variable} ${instrument.variable} ${dmMono.variable}`;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/signin" });
  }

  if (!session?.user) {
    return (
      <html lang="es">
        <body className={`${fontVars} antialiased`}>
          <div className="flex min-h-dvh justify-center bg-[radial-gradient(120%_90%_at_50%_-10%,#f1e9dc_0%,#e7dcca_60%,#ddd0bb_100%)] px-4 py-10">
            <main className="w-full max-w-md">{children}</main>
          </div>
        </body>
      </html>
    );
  }

  const user = session.user;

  return (
    <html lang="es">
      <body className={`${fontVars} antialiased`}>
        <div className="flex min-h-dvh justify-center bg-[radial-gradient(120%_90%_at_50%_-10%,#f1e9dc_0%,#e7dcca_60%,#ddd0bb_100%)]">
          <div className="flex w-full max-w-[1280px] bg-paper shadow-[0_0_90px_rgba(60,40,20,0.14)]">
            <Sidebar user={user} signOutAction={handleSignOut} />
            <main className="min-w-0 flex-1 pb-28 md:pb-0">
              <MobileTopBar user={user} />
              <div className="px-5 py-6 sm:px-6 md:px-11 md:py-10">{children}</div>
            </main>
          </div>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
