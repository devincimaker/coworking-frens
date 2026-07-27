import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, DM_Mono } from "next/font/google";
import { appUrl } from "@/lib/url";
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

const TITLE = "Coworking Frens";
const DESCRIPTION =
  "Cada semana tus amigos abren su casa para laburar juntos. Una con silencio, otra con música, otra con el mate puesto. Vos elegís a cuál ir.";

// metadataBase makes the generated opengraph-image URL absolute, which every
// scraper requires. appUrl() prefers APP_URL, then the stable Vercel production
// domain — never the per-deployment URL when a real domain exists.
export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    locale: "es_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = `${bricolage.variable} ${instrument.variable} ${dmMono.variable}`;

  // The font variables must live on <html>, not <body>: `@theme` resolves
  // --font-display/body/mono against :root, so on <body> they land too late
  // and every utility falls back to system-ui.
  return (
    <html lang="es" className={fontVars}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
