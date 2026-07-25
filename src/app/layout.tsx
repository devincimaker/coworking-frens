import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, DM_Mono } from "next/font/google";
import { FeedbackWidget } from "@/components/feedback-widget";
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
  const fontVars = `${bricolage.variable} ${instrument.variable} ${dmMono.variable}`;

  // The font variables must live on <html>, not <body>: `@theme` resolves
  // --font-display/body/mono against :root, so on <body> they land too late
  // and every utility falls back to system-ui.
  return (
    <html lang="es" className={fontVars}>
      <body className="antialiased">
        {children}
        <FeedbackWidget />
      </body>
    </html>
  );
}
