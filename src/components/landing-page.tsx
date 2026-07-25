import Image from "next/image";
import Link from "next/link";

const APP_SIGNIN = "/signin?callbackUrl=%2Fjuntadas";
const HOST_SIGNIN = "/signin?callbackUrl=%2Fhost";
// Self-hosted: the previous Unsplash hotlink failed intermittently. Swap for a
// real photo of a real house when there is one — the DS calls for exactly that.
const HERO_IMAGE = "/hero-casa.jpg";

const goers = [
  { initial: "C", color: "var(--color-host-violet)" },
  { initial: "B", color: "var(--color-host-coral)" },
  { initial: "M", color: "var(--color-host-green)" },
  { initial: "S", color: "var(--color-host-amber)" },
];

const ring = [
  { initial: "L", color: "var(--color-host-coral)" },
  { initial: "C", color: "var(--color-host-violet)" },
  { initial: "B", color: "var(--color-host-blue)" },
  { initial: "M", color: "var(--color-host-green)" },
  { initial: "S", color: "var(--color-host-amber)" },
];

const badOptions = [
  {
    n: "01",
    title: "Tu casa",
    body: "La misma silla de siempre. No hablás con nadie hasta las siete.",
  },
  {
    n: "02",
    title: "Un café",
    body: "Rodeado de gente e igual de solo, comprando algo cada hora para justificar la mesa.",
  },
  {
    n: "03",
    title: "Un cowork",
    body: "Pagás una cuota por mes para sentarte con auriculares, con el horario y las reglas de una oficina que no es tuya.",
  },
];

const steps = [
  {
    n: "01",
    color: "var(--color-host-coral)",
    title: "Sumás a tus amigos",
    body: "Los buscás por nombre, o los invitás con tu link si todavía no están.",
  },
  {
    n: "02",
    color: "var(--color-host-blue)",
    title: "La casa la pone alguno",
    body: "Puede ser la tuya: elegís el día, el horario y cuántas sillas hay. Si la abre otro, ves todo eso y quiénes ya se anotaron.",
  },
  {
    n: "03",
    color: "var(--color-host-green)",
    title: "Tocás y vas",
    body: "El que llega primero se queda con la silla. Sin pedir permiso y sin cadena de mensajes que se muere.",
  },
];

const houses = [
  {
    initial: "M",
    name: "Lo de Meli",
    when: "Mar y Jue · 9:00–14:00",
    quote: "Silencio hasta las 13. Modo foco, sin charla.",
    accent: "var(--color-host-violet)",
    photo: "/casas/meli.jpg",
    alt: "Un escritorio de madera junto a la ventana, con plantas y auriculares",
  },
  {
    initial: "L",
    name: "El patio de Luján",
    when: "Jue · 9:00–18:00",
    quote: "Música fuerte, mate, y al mediodía cocinamos algo.",
    accent: "var(--color-host-coral)",
    photo: "/casas/lujan.jpg",
    alt: "Una mesa larga puesta en el patio, bajo la sombra de un árbol",
  },
  {
    initial: "N",
    name: "El Nido",
    when: "Lun · 14:00–20:00",
    quote: "Cada uno en la suya. Hay perro y no se negocia.",
    accent: "var(--color-host-green)",
    photo: "/casas/nido.jpg",
    alt: "Un living con sillón de cuero, plantas y la chimenea prendida",
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-[clamp(28px,3.4vw,44px)] font-mono text-[11px] leading-[1.2] font-medium tracking-[.14em] text-ink-500 uppercase">
      {children}
    </p>
  );
}

function AvatarStack({
  people,
  size,
  ringColor,
}: {
  people: { initial: string; color: string }[];
  size: number;
  ringColor: string;
}) {
  return (
    <div className="flex">
      {people.map((person, i) => (
        <span
          key={`${person.initial}-${i}`}
          className="flex items-center justify-center rounded-full font-semibold text-white"
          style={{
            width: size,
            height: size,
            fontSize: size < 29 ? 11 : 12,
            background: person.color,
            border: `2px solid ${ringColor}`,
            marginLeft: i === 0 ? 0 : size < 29 ? -7 : -8,
          }}
        >
          {person.initial}
        </span>
      ))}
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="w-full bg-sand-300 px-[clamp(18px,4vw,48px)]">
      <div className="mx-auto max-w-[1140px]">
        {/* NAV */}
        <nav className="flex items-center justify-between py-[22px]">
          <Link href="/" aria-label="Frens" className="flex items-center gap-2.5">
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-coral-500 font-display text-base font-bold text-white">
              F
            </span>
            <span className="font-display text-[21px] font-bold tracking-[-.01em] text-ink-800">
              Frens
            </span>
          </Link>
          <Link
            href={APP_SIGNIN}
            className="rounded-[11px] bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-[140ms] ease-[cubic-bezier(.2,.7,.3,1)] hover:bg-coral-600"
          >
            Entrar
          </Link>
        </nav>

        {/* HERO */}
        <header className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-center gap-[clamp(32px,5vw,64px)] pt-[clamp(48px,6vw,80px)]">
          <div>
            <h1 className="text-balance font-display text-[clamp(44px,6.4vw,88px)] leading-[0.96] font-bold tracking-[-.035em] text-ink-900">
              Coworking entre amigos
            </h1>
            <p className="mt-[26px] max-w-[430px] text-pretty text-[clamp(17px,1.6vw,20px)] leading-[1.5] text-[oklch(0.44_0.03_60)]">
              Cada semana tus amigos abren su casa para laburar juntos. Una con silencio, otra con
              música, otra con el mate puesto. Vos elegís a cuál ir.
            </p>
            <div className="mt-[34px] flex flex-wrap items-center gap-5">
              <Link
                href={APP_SIGNIN}
                className="rounded-[13px] bg-coral-500 px-7 py-[15px] text-base font-semibold text-white shadow-[0_14px_30px_-14px_var(--color-coral-500)] transition-colors duration-[140ms] ease-[cubic-bezier(.2,.7,.3,1)] hover:bg-coral-600"
              >
                Entrar a Frens
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/3.35] w-full overflow-hidden rounded-[24px] shadow-[0_40px_80px_-40px_rgba(60,40,20,.6)]">
              <Image
                src={HERO_IMAGE}
                alt="El patio de Luján preparado para laburar: mesa larga, plantas y luz de la tarde"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover object-[78%_44%]"
              />
            </div>
            <div className="pointer-events-none absolute top-4 left-4 rounded-[20px] bg-[rgba(255,253,250,.94)] px-[13px] py-1.5 font-mono text-xs font-medium text-[#3b332a] shadow-[0_6px_16px_-8px_rgba(60,40,20,.6)]">
              Luján de Cuyo
            </div>
            <div className="absolute -bottom-[26px] left-[clamp(-8px,-1vw,0px)] w-[min(340px,88%)] rounded-[18px] bg-sheet px-[18px] py-4 shadow-[0_26px_50px_-24px_rgba(60,40,20,.65)]">
              <div className="flex items-center justify-between gap-2.5">
                <span className="font-mono text-xs font-medium text-ink-500">
                  Jue 18 · 9:00–13:00
                </span>
                <span className="rounded-[20px] bg-host-green-soft px-2.5 py-[3px] font-mono text-xs font-medium text-[oklch(0.45_0.13_150)]">
                  6/8
                </span>
              </div>
              <div className="mt-1.5 font-display text-[21px] font-bold tracking-[-.01em] text-ink-900">
                El patio de Luján
              </div>
              <div className="mt-[13px] flex items-center gap-2.5">
                <AvatarStack people={goers} size={27} ringColor="var(--color-sheet)" />
                <span className="text-[13px] font-medium text-ink-500">Lu, Cami, Beto y más</span>
              </div>
            </div>
          </div>
        </header>

        {/* PROBLEM */}
        <section className="mt-[26px] border-t border-rule pt-[clamp(64px,8vw,110px)]">
          <h2 className="max-w-[660px] text-balance font-display text-[clamp(30px,4.4vw,54px)] leading-[1.04] font-bold tracking-[-.028em] text-ink-900">
            Si trabajás remoto, tenés tres opciones malas.
          </h2>

          <div className="mt-[clamp(28px,3.4vw,44px)] grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-px overflow-hidden rounded-[20px] border border-rule bg-rule">
            {badOptions.map((option) => (
              <div key={option.n} className="bg-sand-200 px-6 pt-[26px] pb-[30px]">
                <div className="font-mono text-[11px] font-medium tracking-[.06em] text-ink-400">
                  {option.n}
                </div>
                <div className="mt-3.5 font-display text-[22px] font-bold tracking-[-.01em] text-ink-900">
                  {option.title}
                </div>
                <div className="mt-2 text-pretty text-[15px] leading-[1.55] text-[oklch(0.47_0.03_60)]">
                  {option.body}
                </div>
              </div>
            ))}
          </div>

          <div className="relative mt-[18px] overflow-hidden rounded-[22px] bg-coral-500 px-[clamp(26px,4vw,54px)] py-[clamp(34px,4.4vw,54px)] shadow-[0_30px_60px_-34px_var(--color-coral-500)]">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-[18px] right-[clamp(-10px,1vw,24px)] font-display text-[clamp(120px,16vw,200px)] leading-none font-bold text-white/[.11] select-none"
            >
              04
            </div>
            <div className="relative max-w-[620px]">
              <div className="font-mono text-[11px] font-medium tracking-[.1em] text-white/70">
                LA QUE FALTA
              </div>
              <div className="mt-3.5 text-balance font-display text-[clamp(26px,3.6vw,44px)] leading-[1.08] font-bold tracking-[-.024em] text-white">
                Falta una cuarta: la casa de un amigo.
              </div>
              <div className="mt-3.5 max-w-[480px] text-pretty text-[clamp(16px,1.5vw,18px)] leading-[1.55] text-white/85">
                La casa siempre estuvo. Lo que falta es que juntarse sea fácil todas las semanas.
                Que sea un plan fijo y no algo que alguien tiene que salir a organizar cada vez.
              </div>
            </div>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section className="pt-[clamp(64px,8vw,110px)]">
          <Eyebrow>Cómo funciona</Eyebrow>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-[clamp(24px,3.4vw,44px)]">
            {steps.map((step) => (
              <div key={step.n} className="border-t-[1.5px] border-ink-900 pt-[18px]">
                <div
                  className="font-display text-[40px] leading-none font-bold tracking-[-.03em]"
                  style={{ color: step.color }}
                >
                  {step.n}
                </div>
                <div className="mt-3.5 font-display text-[23px] font-bold tracking-[-.012em] text-ink-900">
                  {step.title}
                </div>
                <div className="mt-2 text-pretty text-[15px] leading-[1.6] text-ink-600">
                  {step.body}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CADA CASA TIENE SU ONDA */}
        <section className="pt-[clamp(64px,8vw,110px)]">
          <Eyebrow>Cada casa tiene su onda</Eyebrow>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(270px,1fr))] gap-[18px]">
            {houses.map((house) => (
              <div
                key={house.name}
                className="overflow-hidden rounded-[20px] border border-rule-soft bg-sheet shadow-[0_16px_36px_-28px_rgba(60,40,20,.7)]"
              >
                <div className="relative h-[132px]">
                  <Image
                    src={house.photo}
                    alt={house.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, 370px"
                    className="object-cover"
                  />
                </div>
                <div className="px-[22px] pt-5 pb-6">
                  <div className="flex items-center gap-[9px]">
                    <span
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-[11px] font-semibold text-white"
                      style={{ background: house.accent }}
                    >
                      {house.initial}
                    </span>
                    <span className="font-display text-[19px] font-bold tracking-[-.01em] text-ink-900">
                      {house.name}
                    </span>
                  </div>
                  <div className="mt-[9px] font-mono text-xs font-medium text-ink-500">
                    {house.when}
                  </div>
                  <div
                    className="mt-[15px] border-l-2 pl-[13px] text-pretty text-base leading-[1.5] text-ink-700"
                    style={{ borderColor: house.accent }}
                  >
                    “{house.quote}”
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-[clamp(28px,3.4vw,44px)] max-w-[720px] text-pretty text-[clamp(17px,1.7vw,21px)] leading-[1.55] text-[oklch(0.42_0.03_60)]">
            No hay una regla: el que abre la casa marca el tono.{" "}
            <strong className="font-semibold text-ink-900">
              Vos elegís a cuál ir según el día que tengas.
            </strong>{" "}
            Hay días de silencio y días de gente. Un cowork te da un solo seteo para siempre.
          </p>
        </section>

        {/* CON QUIÉN */}
        <section className="pt-[clamp(64px,8vw,110px)]">
          <Eyebrow>Con quién</Eyebrow>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[clamp(24px,3.4vw,48px)]">
            <div className="border-t border-rule-strong pt-5">
              <div className="font-display text-[clamp(23px,2.6vw,30px)] font-bold tracking-[-.018em] text-ink-900">
                Vas por la gente
              </div>
              <div className="mt-2.5 max-w-[400px] text-pretty text-base leading-[1.6] text-ink-600">
                Es gente que ya te cae bien. Ves quiénes van antes de decir que sí, y vas por ellos,
                no por el escritorio.
              </div>
            </div>
            <div className="border-t border-rule-strong pt-5">
              <div className="font-display text-[clamp(23px,2.6vw,30px)] font-bold tracking-[-.018em] text-ink-900">
                Y conocés gente nueva
              </div>
              <div className="mt-2.5 max-w-[420px] text-pretty text-base leading-[1.6] text-ink-600">
                El anfitrión decide si abre solo a sus amigos o también a los amigos de ellos. Con un
                conocido en común y algo para hacer, es la mejor forma que queda de conocer a
                alguien.
              </div>
              <div className="mt-[18px] flex items-center gap-2.5">
                <AvatarStack people={ring} size={30} ringColor="var(--color-sand-300)" />
                <span className="font-mono text-[13px] font-medium text-ink-500">+ los suyos</span>
              </div>
            </div>
          </div>
        </section>

        {/* HOST CTA */}
        <section className="mt-[clamp(36px,4.4vw,66px)] flex flex-wrap items-center justify-between gap-6 rounded-[24px] border border-[rgba(60,40,20,.1)] bg-sand-100 p-[clamp(28px,3.6vw,44px)]">
          <div className="max-w-[560px]">
            <div className="font-display text-[clamp(22px,2.5vw,28px)] font-bold tracking-[-.018em] text-ink-900">
              ¿Y si la casa la ponés vos?
            </div>
            <div className="mt-[9px] text-pretty text-base leading-[1.6] text-ink-600">
              Vos elegís el día, cuántas sillas hay y qué amigos lo ven. Tu dirección la ven solo los
              que se anotan. Cancelás cuando quieras, sin dar explicaciones.
            </div>
          </div>
          <Link
            href={HOST_SIGNIN}
            className="flex-none rounded-[13px] border border-[rgba(60,40,20,.18)] bg-sheet px-[26px] py-3.5 text-[15px] font-semibold text-ink-900 transition-colors duration-[140ms] ease-[cubic-bezier(.2,.7,.3,1)] hover:border-[rgba(60,40,20,.4)] hover:bg-white"
          >
            Abrir mi casa
          </Link>
        </section>

        {/* CTA FINAL */}
        <section className="mt-[18px] rounded-[26px] bg-coral-500 px-[clamp(24px,4vw,48px)] py-[clamp(52px,7vw,86px)] text-center shadow-[0_34px_66px_-36px_var(--color-coral-500)]">
          <h2 className="text-balance font-display text-[clamp(30px,4.8vw,58px)] leading-[1.03] font-bold tracking-[-.03em] text-white">
            Menos coordinación. Más juntarse.
          </h2>
          <p className="mx-auto mt-[18px] mb-8 max-w-[480px] text-pretty text-[clamp(16px,1.6vw,19px)] leading-[1.55] text-white/85">
            Entrá, buscá a tus amigos, y que la primera juntada la abra el que tenga la casa más
            cómoda.
          </p>
          <Link
            href={APP_SIGNIN}
            className="inline-block rounded-[13px] bg-sheet px-[34px] py-4 text-base font-semibold text-coral-600 transition-colors duration-[140ms] ease-[cubic-bezier(.2,.7,.3,1)] hover:bg-white hover:text-coral-700"
          >
            Entrar a Frens
          </Link>
        </section>

        {/* FOOTER */}
        <footer className="py-[clamp(40px,5vw,60px)] text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 font-mono text-[13px] font-medium text-ink-500">
            <span>Hecho por humano.inc · 2026</span>
            <Link
              href="/terminos"
              className="border-b border-[rgba(60,40,20,.2)] text-ink-500 transition-colors duration-[140ms] hover:text-ink-900"
            >
              Términos y Condiciones
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
