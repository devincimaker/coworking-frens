import Link from "next/link";

const APP_SIGNIN = "/signin?callbackUrl=%2Fjuntadas";
const HOST_SIGNIN = "/signin?callbackUrl=%2Fhost";

const previewGoers = [
  { name: "Cami", initial: "C", color: "oklch(0.64 0.13 295)" },
  { name: "Beto", initial: "B", color: "oklch(0.60 0.16 40)" },
  { name: "Meli", initial: "M", color: "oklch(0.66 0.14 150)" },
  { name: "Sol", initial: "S", color: "oklch(0.70 0.14 90)" },
];

const comparisons = [
  {
    eyebrow: "SOLO EN TU DEPTO",
    title: "Cero socialización",
    body: "Auriculares puestos, la misma silla, las mismas cuatro paredes. Terminás el día sin haber cruzado palabra con nadie.",
    featured: false,
  },
  {
    eyebrow: "UN COWORK",
    title: "Corporativo y con horario",
    body: "Te cierran a las 6 de la tarde, pagás por mes, y al final cada uno con sus auriculares igual. Nadie te conoce.",
    featured: false,
  },
  {
    eyebrow: "CON FRENS",
    title: "La casa de un amigo",
    body: "Gente conocida, el horario que quieras (mañana, tarde o noche), y el clima que le pongan entre todos. Sin reloj corporativo.",
    featured: true,
  },
];

const meetupTypes = [
  {
    eyebrow: "CLIMA CONCENTRADO",
    title: "Cabeza en el laburo",
    body: "Silencio, buen café y pocas interrupciones. Cada uno en lo suyo pero acompañado. A la hora que el anfitrión quiera, sea mañana o de noche.",
    bar: "oklch(0.7 0.13 90)",
    text: "oklch(0.55 0.1 90)",
  },
  {
    eyebrow: "CLIMA SUELTO",
    title: "Laburo + balconeo",
    body: "Música de fondo, charla y medio laburo medio junta. Más social y relajado. También a la hora que el anfitrión elija, no hay regla.",
    bar: "oklch(0.55 0.16 300)",
    text: "oklch(0.52 0.16 300)",
  },
];

const essentials = [
  {
    title: "Cuándo",
    body: "Qué día y a qué hora. Con el horario clarito, sin adivinar.",
    icon: <ClockIcon />,
    bg: "oklch(0.94 0.04 40)",
    color: "oklch(0.56 0.16 40)",
  },
  {
    title: "Dónde",
    body: "La casa de quién, en qué barrio y una foto del lugar. Sabés bien a dónde vas.",
    icon: <HomeIcon />,
    bg: "oklch(0.94 0.04 250)",
    color: "oklch(0.5 0.1 250)",
  },
  {
    title: "Quiénes van",
    body: "Los nombres de todos los que se anotaron, y cuántos lugares quedan.",
    icon: <PeopleIcon />,
    bg: "oklch(0.93 0.05 150)",
    color: "oklch(0.5 0.13 150)",
  },
];

const steps = [
  {
    num: "01",
    accent: "oklch(0.56 0.16 40)",
    title: "Alguien abre su casa",
    body: "Elegís el día, el horario y cuántos entran. Ponés las reglas de la casa.",
  },
  {
    num: "02",
    accent: "oklch(0.5 0.1 250)",
    title: "El resto se suma",
    body: "Todos ven la juntada y se anotan con un toque, mientras haya lugar.",
  },
  {
    num: "03",
    accent: "oklch(0.5 0.13 150)",
    title: "Se labura junto",
    body: "Café, buena compañía y menos horas solo en el depto. Listo.",
  },
];

function ClockIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4.5l3 1.8" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 11l8-6 8 6" />
      <path d="M6 10v9h12v-9" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="3.2" />
      <circle cx="16.5" cy="10.5" r="2.4" />
      <path d="M3.5 19c0-3 2.6-4.6 5.5-4.6s5.5 1.6 5.5 4.6" />
      <path d="M16 14.6c2.2.1 4 1.5 4 4" />
    </svg>
  );
}

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
    <div className="mx-auto mt-14 max-w-[760px] overflow-hidden rounded-[26px] border border-[rgba(60,40,20,0.08)] bg-white shadow-[0_34px_70px_-34px_rgba(60,40,20,0.5)]">
      <div className="flex items-baseline gap-3 px-6 pt-5 pb-3">
        <span className="font-display text-lg font-bold text-ink">Jue 18</span>
        <span className="font-mono text-base font-semibold text-faded">9:00-13:00</span>
      </div>
      <div className="flex flex-wrap border-t border-[rgba(60,40,20,0.07)]">
        <div className="relative min-h-[170px] flex-none basis-full sm:basis-[220px]">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,oklch(0.92_0.05_250)_0_20px,oklch(0.88_0.06_250)_20px_40px)]" />
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-medium text-[oklch(0.5_0.1_250)] opacity-70">
            [ foto ]
          </div>
        </div>

        <div className="flex min-w-[240px] flex-1 flex-col px-6 py-5">
          <div className="font-display text-[22px] leading-tight font-bold text-ink">
            el estudio de Marco
          </div>
          <div className="mt-1 text-[13px] font-medium text-faded">Chacarita</div>
          <div className="mt-4 flex items-center gap-2.5">
            <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-[oklch(0.6_0.14_250)] text-sm font-semibold text-white">
              M
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-ink">Lo hostea Marco</div>
              <div className="font-mono text-[11px] font-medium text-faded">anfitrión</div>
            </div>
          </div>
        </div>

        <div className="w-full flex-none border-t border-[rgba(60,40,20,0.07)] px-5 py-4 sm:w-[200px] sm:border-t-0 sm:border-l">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="font-mono text-[11px] font-semibold text-faded">QUIÉNES VAN</span>
            <span className="font-mono text-xs font-semibold text-[oklch(0.6_0.14_250)]">6/8</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
            {previewGoers.map((person) => (
              <div key={person.name} className="flex min-w-0 items-center gap-2">
                <span
                  className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full text-[11px] font-semibold text-white"
                  style={{ backgroundColor: person.color }}
                >
                  {person.initial}
                </span>
                <span className="truncate text-[13px] font-medium text-ink">{person.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-dvh w-full bg-[radial-gradient(120%_80%_at_50%_-10%,#f1e9dc_0%,#e7dcca_55%,#ddd0bb_100%)] px-[22px] pb-[90px] text-ink">
      <div className="mx-auto max-w-[1080px]">
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
            Entrar a la app
          </Link>
        </nav>

        <header className="pt-12 pb-5 text-center">
          <h1 className="mx-auto max-w-[900px] text-balance font-display text-[clamp(2.5rem,7vw,4.625rem)] leading-[1.02] font-bold text-ink">
            Trabajemos juntos,
            <br />
            en la casa de alguno.
          </h1>
          <p className="mx-auto mt-5 max-w-[580px] text-pretty text-[clamp(1rem,2.2vw,1.25rem)] leading-7 font-medium text-[oklch(0.44_0.03_60)]">
            Ni solo en tu depto, ni en un cowork corpo que cierra a las 6. Frens es donde alguien
            abre su casa y el resto se suma a laburar, en el horario y el clima que quieran.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <CtaLink href={APP_SIGNIN}>Ver las próximas juntadas</CtaLink>
            <CtaLink href={HOST_SIGNIN} variant="secondary">
              Abrir una en tu casa
            </CtaLink>
          </div>
        </header>

        <PreviewCard />

        <section className="mt-24">
          <h2 className="m-0 text-center font-display text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.05] font-bold text-ink text-balance">
            ¿Solo en casa o en un cowork?
          </h2>
          <p className="mx-auto mt-2 mb-10 max-w-[520px] text-center text-base font-medium text-[oklch(0.48_0.03_60)] text-pretty">
            Las dos opciones de siempre tienen su costo. Frens es el punto medio.
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[18px]">
            {comparisons.map((item) => (
              <div
                key={item.eyebrow}
                className={`rounded-[22px] p-6 ${
                  item.featured
                    ? "border-[1.5px] border-clay bg-[oklch(0.97_0.02_60)] shadow-[0_14px_34px_-22px_var(--color-clay)]"
                    : "border border-[rgba(60,40,20,0.1)] bg-white/50"
                }`}
              >
                <div
                  className={`mb-2 font-mono text-xs font-medium ${
                    item.featured ? "text-clay-deep" : "text-faded"
                  }`}
                >
                  {item.eyebrow}
                </div>
                <div className="font-display text-xl font-bold text-ink">{item.title}</div>
                <div className="mt-2 text-pretty text-sm leading-6 font-medium text-[oklch(0.48_0.03_60)]">
                  {item.body}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-24">
          <h2 className="m-0 text-center font-display text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.05] font-bold text-ink text-balance">
            No toda juntada es igual
          </h2>
          <p className="mx-auto mt-2 mb-10 max-w-[560px] text-center text-base font-medium text-[oklch(0.48_0.03_60)] text-pretty">
            Cada anfitrión define el clima de la suya: la casa, el horario y qué se espera. Una
            mañana puede ser una fiesta y una noche puede ser puro silencio.
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-[18px]">
            {meetupTypes.map((item) => (
              <div
                key={item.eyebrow}
                className="overflow-hidden rounded-[22px] border border-[rgba(60,40,20,0.08)] bg-white shadow-[0_12px_30px_-22px_rgba(60,40,20,0.5)]"
              >
                <div className="h-2" style={{ backgroundColor: item.bar }} />
                <div className="px-6 py-7">
                  <div className="mb-2.5 font-mono text-xs font-medium" style={{ color: item.text }}>
                    {item.eyebrow}
                  </div>
                  <div className="font-display text-2xl font-bold text-ink">{item.title}</div>
                  <div className="mt-2.5 text-pretty text-[15px] leading-6 font-medium text-[oklch(0.46_0.03_60)]">
                    {item.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-24">
          <h2 className="m-0 text-center font-display text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.05] font-bold text-ink">
            Todo lo que importa, de una
          </h2>
          <p className="mx-auto mt-2 mb-10 max-w-[480px] text-center text-base font-medium text-[oklch(0.48_0.03_60)]">
            Sin grupos de WhatsApp caóticos. Cada juntada te dice lo justo:
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[18px]">
            {essentials.map((item) => (
              <div
                key={item.title}
                className="rounded-[22px] border border-[rgba(60,40,20,0.08)] bg-white p-6 shadow-[0_12px_30px_-22px_rgba(60,40,20,0.5)]"
              >
                <div
                  className="mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-[13px]"
                  style={{ backgroundColor: item.bg, color: item.color }}
                >
                  {item.icon}
                </div>
                <div className="font-display text-xl font-bold text-ink">{item.title}</div>
                <div className="mt-1.5 text-pretty text-sm leading-6 font-medium text-[oklch(0.48_0.03_60)]">
                  {item.body}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-[90px] rounded-[26px] border border-[rgba(60,40,20,0.08)] bg-white px-[clamp(1.5rem,5vw,3.5rem)] py-11 shadow-[0_20px_50px_-34px_rgba(60,40,20,0.5)]">
          <h2 className="m-0 mb-9 text-center font-display text-[clamp(1.625rem,3.6vw,2.25rem)] font-bold text-ink">
            Cómo funciona
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-7">
            {steps.map((step) => (
              <div key={step.num}>
                <div className="mb-2.5 font-mono text-[13px] font-medium" style={{ color: step.accent }}>
                  {step.num}
                </div>
                <div className="font-display text-[19px] font-bold text-ink">{step.title}</div>
                <div className="mt-1.5 text-pretty text-sm leading-6 font-medium text-[oklch(0.48_0.03_60)]">
                  {step.body}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-[28px] bg-clay px-7 py-[60px] text-center shadow-[0_30px_60px_-30px_var(--color-clay)]">
          <h2 className="m-0 text-balance font-display text-[clamp(1.875rem,4.5vw,2.875rem)] leading-[1.05] font-bold text-white">
            ¿Quién abre su casa esta semana?
          </h2>
          <p className="mx-auto mt-4 mb-7 max-w-[460px] text-[17px] font-medium text-white/85">
            Sumate a una juntada o armá la tuya. Es entre amigos, así de simple.
          </p>
          <CtaLink href={APP_SIGNIN} variant="light">
            Entrar a Frens
          </CtaLink>
        </section>

        <footer className="pt-11 text-center font-mono text-[13px] font-medium text-[oklch(0.5_0.03_60)]">
          Frens · laburá entre amigos · 2026
        </footer>
      </div>
    </div>
  );
}
