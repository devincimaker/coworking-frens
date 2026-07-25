import Image from "next/image";
import Link from "next/link";

const APP_SIGNIN = "/signin?callbackUrl=%2Fjuntadas";
const HOST_SIGNIN = "/signin?callbackUrl=%2Fhost";
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1678837050409-e5138115f277?q=80&w=1400&auto=format&fit=crop";

const previewGoers = [
  { name: "Cami", initial: "C", color: "oklch(0.64 0.13 295)" },
  { name: "Beto", initial: "B", color: "oklch(0.60 0.16 40)" },
  { name: "Meli", initial: "M", color: "oklch(0.66 0.14 150)" },
  { name: "Sol", initial: "S", color: "oklch(0.70 0.14 90)" },
];

const advantages = [
  {
    title: "Cada juntada tiene su onda",
    body: "Puede ser foco total, mate y ayuda, o cada uno en la suya. El anfitrión marca el tono.",
  },
  {
    title: "Más chico, más amigo",
    body: "Menos luces blancas y diseño corpo. Juntadas con gente conocida, en lugares donde dan ganas de quedarse.",
  },
  {
    title: "No cierra a las 18",
    body: "Si pinta laburar de noche, se arma. Y como es en casa, puede seguir en cena, asadito o previa.",
  },
];

function CtaLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "light";
}) {
  const className = {
    primary:
      "bg-clay text-white shadow-[0_14px_28px_-12px_var(--color-clay)] hover:bg-clay-deep",
    secondary:
      "border border-[rgba(60,40,20,0.16)] bg-white/70 text-ink hover:bg-white",
    light: "bg-white text-clay-deep hover:bg-[oklch(0.98_0.015_55)]",
  }[variant];

  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center rounded-[14px] px-7 py-3.5 text-base font-semibold transition-[background-color,transform] active:scale-[0.98] ${className}`}
    >
      {children}
    </Link>
  );
}

function PreviewCard() {
  return (
    <div className="overflow-hidden rounded-[26px] border border-[rgba(60,40,20,0.08)] bg-white shadow-[0_34px_70px_-34px_rgba(60,40,20,0.5)]">
      <div className="relative h-[320px] sm:aspect-[5/4] sm:h-auto sm:min-h-[360px]">
        <Image
          src={HERO_IMAGE}
          alt="Galería luminosa con una mesa larga y plantas preparada para coworking"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 520px"
          className="object-cover object-[78%_44%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(43,38,32,0.02)_35%,rgba(43,38,32,0.62)_100%)]" />
        <div className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1.5 font-mono text-xs font-semibold text-ink shadow-[0_12px_24px_-18px_rgba(0,0,0,0.5)]">
          Luján de Cuyo
        </div>
        <div className="absolute right-4 bottom-4 left-4 rounded-[20px] bg-white/94 p-4 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.55)] sm:right-auto sm:w-[380px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs font-semibold text-faded">Jue 18 · 9:00-13:00</p>
              <h2 className="mt-1 font-display text-2xl font-bold leading-tight text-ink">
                El patio de Luján
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-[oklch(0.93_0.05_150)] px-3 py-1.5 font-mono text-xs font-semibold text-[oklch(0.43_0.1_150)]">
              6/8
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex -space-x-2">
              {previewGoers.map((person) => (
                <span
                  key={person.name}
                  title={person.name}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white"
                  style={{ backgroundColor: person.color }}
                >
                  {person.initial}
                </span>
              ))}
            </div>
            <span className="hidden min-w-0 truncate text-sm font-semibold text-faded sm:block">
              Lu, Cami, Beto y más
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-dvh w-full bg-[radial-gradient(120%_80%_at_50%_-10%,#f1e9dc_0%,#e7dcca_55%,#ddd0bb_100%)] px-[22px] pb-16 text-ink">
      <div className="mx-auto max-w-[1120px]">
        <nav className="flex items-center justify-between px-1 py-6">
          <Link href="/" aria-label="Frens" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-clay font-display text-[17px] font-bold text-white">
              F
            </span>
            <span className="font-display text-[22px] font-bold text-ink">Frens</span>
          </Link>
          <Link
            href={APP_SIGNIN}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_-12px_var(--color-clay)] transition-colors hover:bg-clay-deep"
          >
            Entrar
          </Link>
        </nav>

        <header className="grid gap-10 pt-10 pb-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:pt-16">
          <div>
            <h1 className="max-w-[760px] text-balance font-display text-[clamp(3rem,7vw,5.75rem)] leading-[0.95] font-bold text-ink">
              Coworking entre amigos
            </h1>
            <p className="mt-6 max-w-[560px] text-pretty text-[clamp(1.1rem,2.2vw,1.45rem)] leading-8 font-medium text-[oklch(0.42_0.03_60)]">
              Casas disponibles para laburar juntos con amigos. Ves quién hostea, quién va y
              cuántos lugares quedan antes de anotarte.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CtaLink href={APP_SIGNIN}>Ver juntadas</CtaLink>
              <CtaLink href={HOST_SIGNIN} variant="secondary">
                Hostear una
              </CtaLink>
            </div>
          </div>

          <PreviewCard />
        </header>

        <section className="py-16">
          <p className="mb-8 font-mono text-sm font-semibold tracking-wide text-faded uppercase">
            Por qué Frens
          </p>
          <div className="grid gap-5 sm:grid-cols-3 lg:gap-7">
            {advantages.map((advantage) => (
              <div key={advantage.title} className="border-t border-[rgba(60,40,20,0.14)] pt-5">
                <h3 className="font-display text-2xl font-bold leading-tight text-ink">
                  {advantage.title}
                </h3>
                <p className="mt-3 max-w-[28ch] text-base leading-7 font-medium text-[oklch(0.47_0.03_60)]">
                  {advantage.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] bg-clay px-7 py-12 text-center shadow-[0_30px_60px_-30px_var(--color-clay)]">
          <h2 className="m-0 text-balance font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02] font-bold text-white">
            Menos coordinación. Más juntarse.
          </h2>
          <div className="mt-7">
            <CtaLink href={APP_SIGNIN} variant="light">
              Entrar a Frens
            </CtaLink>
          </div>
        </section>

        <footer className="pt-8 text-center font-mono text-[13px] font-medium text-[oklch(0.5_0.03_60)]">
          <p>Hecho por humano.inc · 2026</p>
          <p className="mt-2">
            <Link href="/terminos" className="transition-colors hover:text-ink">
              Términos y Condiciones
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
