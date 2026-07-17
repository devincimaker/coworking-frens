import type { Metadata } from "next";
import { Fraunces, Karla } from "next/font/google";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
});

const karla = Karla({ subsets: ["latin"], variable: "--font-karla" });

export const metadata: Metadata = {
  title: "Coworking Frens",
  description: "Cowork at your friends' houses",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${karla.variable} antialiased`}>
        <div className="mx-auto max-w-2xl px-4 pb-24">
          <header className="flex flex-wrap items-center justify-between gap-3 py-5">
            <Link href="/" className="font-display text-xl font-semibold italic tracking-tight">
              coworking <span className="text-clay">frens</span>
            </Link>
            {session?.user && (
              <nav className="flex flex-wrap items-center justify-end gap-1 text-sm font-bold">
                <Link href="/" className="rounded-full px-3 py-1.5 hover:bg-butter/60">
                  Feed
                </Link>
                <Link href="/host" className="rounded-full px-3 py-1.5 hover:bg-butter/60">
                  Host
                </Link>
                <Link href="/friends" className="rounded-full px-3 py-1.5 hover:bg-butter/60">
                  Friends
                </Link>
                <Link href="/profile" className="rounded-full px-3 py-1.5 hover:bg-butter/60">
                  Profile
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/signin" });
                  }}
                >
                  <button
                    className="ml-1 cursor-pointer rounded-full px-3 py-1.5 text-faded hover:bg-butter/60"
                    title={session.user.email ?? undefined}
                  >
                    Out
                  </button>
                </form>
              </nav>
            )}
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
