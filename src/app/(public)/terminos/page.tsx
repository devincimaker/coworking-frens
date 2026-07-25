import type { Metadata } from "next";
import Link from "next/link";
import { TERMS_CONTACT_EMAIL, TERMS_UPDATED_AT, TERMS_VERSION } from "@/lib/terms";

export const metadata: Metadata = {
  title: "Términos y Condiciones · Coworking Frens",
  description:
    "Condiciones de uso de Coworking Frens: qué es la plataforma, qué responsabilidad asume cada usuario y qué riesgos asume quien abre o visita una casa.",
};

// Single source of truth — bumping TERMS_VERSION in src/lib/terms.ts re-gates every
// user until they accept again, and updates the header and footer of this page.
const LAST_UPDATED = TERMS_UPDATED_AT;
const VERSION = TERMS_VERSION;
const CONTACT_EMAIL = TERMS_CONTACT_EMAIL;

const toc = [
  { id: "aceptacion", title: "Aceptación de estos Términos" },
  { id: "que-es", title: "Qué es Frens (y qué no es)" },
  { id: "quien-puede", title: "Quién puede usar Frens" },
  { id: "cuenta", title: "Tu cuenta" },
  { id: "sin-verificacion", title: "No verificamos a nadie ni a ningún lugar" },
  { id: "anfitriones", title: "Anfitriones: tus obligaciones" },
  { id: "invitados", title: "Invitados: tus obligaciones" },
  { id: "gratuidad", title: "Frens es gratis: está prohibido cobrar" },
  { id: "direccion", title: "La dirección y la información privada de otros" },
  { id: "riesgos", title: "Asunción de riesgos" },
  { id: "exclusion", title: "Exclusión de responsabilidad del Titular" },
  { id: "limitacion", title: "Limitación de responsabilidad" },
  { id: "indemnidad", title: "Indemnidad" },
  { id: "sin-garantias", title: "Servicio tal cual, sin garantías" },
  { id: "contenido", title: "Contenido que subís" },
  { id: "conducta", title: "Conducta prohibida" },
  { id: "moderacion", title: "Moderación, suspensión y baja" },
  { id: "datos", title: "Datos personales y privacidad" },
  { id: "menores", title: "Menores de edad" },
  { id: "disponibilidad", title: "Disponibilidad del servicio y fin del proyecto" },
  { id: "propiedad", title: "Propiedad intelectual" },
  { id: "cambios", title: "Cambios en estos Términos" },
  { id: "consumidor", title: "Derechos irrenunciables del consumidor" },
  { id: "ley", title: "Ley aplicable y jurisdicción" },
  { id: "generales", title: "Disposiciones generales" },
  { id: "contacto", title: "Contacto" },
];

function Section({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 border-t border-[rgba(60,40,20,0.14)] pt-7">
      <h2 className="font-display text-[26px] leading-tight font-bold text-ink">
        <span className="mr-2.5 font-mono text-base font-semibold text-clay">
          {String(n).padStart(2, "0")}
        </span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-7 font-medium text-[oklch(0.42_0.03_60)] [&_a]:font-semibold [&_a]:text-clay [&_a]:underline [&_li]:pl-1 [&_strong]:font-bold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

export default function TerminosPage() {
  return (
    <div className="min-h-dvh w-full bg-[radial-gradient(120%_80%_at_50%_-10%,#f1e9dc_0%,#e7dcca_55%,#ddd0bb_100%)] px-[22px] pb-16 text-ink">
      <div className="mx-auto max-w-[820px]">
        <nav className="flex items-center justify-between px-1 py-6">
          <Link href="/" aria-label="Frens" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-clay font-display text-[17px] font-bold text-white">
              F
            </span>
            <span className="font-display text-[22px] font-bold text-ink">Frens</span>
          </Link>
          <Link
            href="/"
            className="font-mono text-sm font-semibold text-faded transition-colors hover:text-ink"
          >
            Volver
          </Link>
        </nav>

        <header className="pt-8 pb-10">
          <p className="font-mono text-sm font-semibold tracking-wide text-faded uppercase">
            Documento legal
          </p>
          <h1 className="mt-3 text-balance font-display text-[clamp(2.5rem,6vw,3.75rem)] leading-[1.02] font-bold text-ink">
            Términos y Condiciones
          </h1>
          <p className="mt-4 font-mono text-[13px] font-medium text-[oklch(0.5_0.03_60)]">
            Versión {VERSION} · Última actualización: {LAST_UPDATED}
          </p>
        </header>

        <div className="rounded-[22px] border border-[rgba(60,40,20,0.14)] bg-white/70 p-6">
          <h2 className="font-display text-xl font-bold text-ink">Resumen en criollo</h2>
          <p className="mt-2 text-[15px] leading-7 font-medium text-[oklch(0.45_0.03_60)]">
            Frens es un tablón para coordinar días de trabajo en casas de amigos. No organizamos
            las juntadas, no revisamos las casas, no chequeamos quién es cada persona y no
            cobramos nada. Lo que pasa cuando entrás a la casa de alguien —o cuando dejás entrar
            gente a la tuya— es entre ustedes, bajo su responsabilidad y su riesgo. Si algo sale
            mal, no es responsabilidad de Frens ni de quien lo desarrolla.
          </p>
          <p className="mt-3 text-[15px] leading-7 font-medium text-[oklch(0.45_0.03_60)]">
            Este resumen es orientativo y <strong className="font-bold text-ink">no</strong> forma
            parte del acuerdo: lo que vale es el texto completo de abajo.
          </p>
        </div>

        <nav aria-label="Índice" className="mt-10">
          <p className="mb-4 font-mono text-sm font-semibold tracking-wide text-faded uppercase">
            Índice
          </p>
          <ol className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
            {toc.map((item, i) => (
              <li key={item.id} className="text-[15px] leading-6 font-medium">
                <a
                  href={`#${item.id}`}
                  className="text-[oklch(0.45_0.03_60)] transition-colors hover:text-clay"
                >
                  <span className="mr-2 font-mono text-[13px] text-clay">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {item.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-12 space-y-9">
          <Section id="aceptacion" n={1} title="Aceptación de estos Términos">
            <p>
              Estos Términos y Condiciones (los <strong>Términos</strong>) regulan el acceso y el
              uso de la aplicación web <strong>Coworking Frens</strong> (la{" "}
              <strong>Plataforma</strong> o <strong>Frens</strong>), operada por su desarrollador y
              titular (el <strong>Titular</strong>).
            </p>
            <p>
              Al crear una cuenta, iniciar sesión, navegar la Plataforma, aceptar una invitación,
              anotarte en una juntada o abrir tu casa, declarás que leíste, entendiste y aceptás
              estos Términos en su totalidad, y que asumís las obligaciones y los riesgos que acá
              se describen. <strong>Si no estás de acuerdo con alguna parte, no uses Frens.</strong>
            </p>
            <p>
              Para usar Frens tenés que aceptar estos Términos de forma expresa, marcando la
              casilla correspondiente al crear tu perfil.{" "}
              <strong>
                La Plataforma registra la fecha, la hora y la versión que aceptaste
              </strong>{" "}
              como constancia de tu consentimiento, y esa constancia podrá ser presentada como
              prueba ante cualquier reclamo.
            </p>
            <p>
              Estos Términos constituyen un acuerdo entre vos (el <strong>Usuario</strong>) y el
              Titular. No generan ningún derecho a favor de terceros ajenos a la Plataforma.
            </p>
          </Section>

          <Section id="que-es" n={2} title="Qué es Frens (y qué no es)">
            <p>
              Frens es <strong>una herramienta de coordinación</strong>: un tablón privado donde
              personas que ya se conocen publican que abren su casa un día determinado y otras
              personas se anotan. Nada más que eso.
            </p>
            <p>Frens, expresamente, NO es y NO presta:</p>
            <ul>
              <li>
                un servicio de alojamiento, hospedaje, hotelería, alquiler temporario ni cesión de
                uso de inmuebles;
              </li>
              <li>
                un servicio de coworking, oficinas compartidas ni espacios de trabajo; el Titular
                no opera, administra, controla ni supervisa ningún inmueble;
              </li>
              <li>
                un servicio de intermediación inmobiliaria, corretaje, agencia de viajes ni
                organización de eventos;
              </li>
              <li>
                un servicio de seguridad, vigilancia, seguros, garantía, custodia de bienes ni
                verificación de antecedentes;
              </li>
              <li>una red social abierta al público ni un servicio de contratación laboral.</li>
            </ul>
            <p>
              El Titular <strong>no es parte</strong> de la relación entre quien abre su casa (el{" "}
              <strong>Anfitrión</strong>) y quien la visita (el <strong>Invitado</strong>). No
              actúa como su mandatario, representante, agente, socio, empleador, organizador,
              asegurador, fiador ni garante, ni asume obligación alguna que corresponda a ellos.
              Cualquier acuerdo, permiso, invitación, autorización de ingreso o conducta entre
              Usuarios se celebra <strong>exclusivamente entre ellos</strong>, por su cuenta y
              riesgo, sin intervención ni control del Titular.
            </p>
          </Section>

          <Section id="quien-puede" n={3} title="Quién puede usar Frens">
            <p>Para usar Frens tenés que:</p>
            <ul>
              <li>
                ser <strong>mayor de 18 años</strong> y tener plena capacidad legal para
                obligarte;
              </li>
              <li>haber sido invitado o aceptado por alguien dentro de la red;</li>
              <li>usar tu identidad real y datos verdaderos, exactos y actualizados;</li>
              <li>
                no tener prohibido el uso del servicio por una decisión previa del Titular ni por
                aplicación de la ley.
              </li>
            </ul>
            <p>
              El Titular puede rechazar, suspender o dar de baja cualquier cuenta, en cualquier
              momento y sin necesidad de expresar causa.
            </p>
          </Section>

          <Section id="cuenta" n={4} title="Tu cuenta">
            <p>
              El acceso se realiza mediante un enlace mágico enviado a tu correo electrónico. Sos
              el único responsable de la seguridad de tu casilla de correo y de toda actividad
              realizada desde tu cuenta.
            </p>
            <p>
              Tu cuenta es personal e intransferible: no la compartas, no la prestes y no permitas
              que un tercero la use. Si detectás un acceso no autorizado, avisá de inmediato a{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. El Titular no responde por
              daños derivados del uso de tu cuenta por terceros, cualquiera sea la causa.
            </p>
            <p>
              Los enlaces de invitación personales permiten a quien los reciba vincularse con vos.
              Sos responsable de a quién se los mandás y de dónde los publicás.
            </p>
          </Section>

          <Section id="sin-verificacion" n={5} title="No verificamos a nadie ni a ningún lugar">
            <p>
              Esta es una de las cláusulas más importantes del documento. El Titular{" "}
              <strong>no realiza ningún tipo de verificación, control ni curaduría</strong>. En
              particular, y sin que la enumeración sea taxativa, el Titular NO verifica:
            </p>
            <ul>
              <li>
                la identidad real, la edad, los antecedentes penales, civiles o comerciales, la
                honestidad, la salud, la solvencia ni la conducta de ningún Usuario;
              </li>
              <li>
                que el Anfitrión sea titular, locatario u ocupante legítimo del inmueble que
                ofrece, ni que esté autorizado a recibir personas allí;
              </li>
              <li>
                las condiciones de seguridad, habitabilidad, higiene, salubridad, instalaciones
                eléctricas o de gas, matafuegos, salidas de emergencia, accesibilidad ni ningún
                otro aspecto material del inmueble;
              </li>
              <li>
                la existencia, vigencia ni cobertura de seguros de ningún tipo (incendio,
                responsabilidad civil, accidentes personales, robo, etc.);
              </li>
              <li>
                el cumplimiento de normas municipales, provinciales o nacionales, reglamentos de
                copropiedad, contratos de locación o reglas de consorcio;
              </li>
              <li>
                la veracidad, exactitud, actualidad o legalidad de la información publicada por los
                Usuarios: direcciones, fotos, horarios, capacidad, amenities, notas de llegada,
                perfiles o cualquier otro contenido.
              </li>
            </ul>
            <p>
              Toda esa información es <strong>declarada unilateralmente por los Usuarios</strong> y
              se muestra tal como fue cargada. El Titular no la audita ni garantiza. Verificar con
              quién te juntás y a dónde vas es tu responsabilidad exclusiva, y también lo es
              decidir a quién dejás entrar a tu casa.
            </p>
          </Section>

          <Section id="anfitriones" n={6} title="Anfitriones: tus obligaciones">
            <p>
              Si abrís tu casa, actuás por tu propia decisión, bajo tu exclusiva responsabilidad y
              como único responsable del inmueble. Declarás y garantizás que:
            </p>
            <ul>
              <li>
                tenés <strong>derecho legal</strong> a usar el inmueble y a recibir personas en él,
                y que hacerlo no viola tu contrato de locación, el reglamento de copropiedad, las
                reglas del consorcio, normas municipales, de countries o barrios privados, ni
                derechos de terceros (cónyuge, convivientes, condóminos, propietario, etc.);
              </li>
              <li>
                contás con el consentimiento de todas las personas que conviven en el inmueble;
              </li>
              <li>
                el lugar se encuentra en <strong>condiciones razonablemente seguras</strong> y que
                informarás cualquier riesgo relevante (escaleras, mascotas, obras, piletas,
                alergénicos, cámaras de seguridad, etc.);
              </li>
              <li>
                sos responsable de <strong>evaluar y contratar por tu cuenta</strong> los seguros
                que consideres necesarios: el Titular no provee ninguna cobertura, garantía ni
                fondo de reparación;
              </li>
              <li>
                sos el <strong>único responsable</strong>, en los términos de los artículos 1757,
                1758 y concordantes del Código Civil y Comercial de la Nación, por los daños
                causados por el riesgo o vicio de la cosa, por su guarda y por lo que ocurra en el
                inmueble;
              </li>
              <li>
                cumplirás con toda obligación fiscal, tributaria, previsional o administrativa que
                pudiera corresponderte;
              </li>
              <li>
                tratarás los datos de tus Invitados (nombres, contacto, presencia en tu casa) con
                confidencialidad y no los usarás para otro fin.
              </li>
            </ul>
            <p>
              Podés cancelar un día abierto cuando quieras y sin expresar motivo. Frens no
              garantiza a nadie que una juntada se concrete, y el Titular no responde por gastos,
              traslados, tiempo perdido ni cualquier otro perjuicio derivado de una cancelación, de
              un cambio de horario o de que el Anfitrión no esté en el lugar.
            </p>
          </Section>

          <Section id="invitados" n={7} title="Invitados: tus obligaciones">
            <p>Si te anotás y vas a la casa de otra persona:</p>
            <ul>
              <li>
                entrás como <strong>invitado a un domicilio particular</strong>, por tu propia
                voluntad y bajo tu exclusivo riesgo, no como cliente de un establecimiento
                habilitado;
              </li>
              <li>
                tenés que respetar las reglas de la casa, los horarios acordados y las indicaciones
                del Anfitrión, y retirarte cuando te lo pidan;
              </li>
              <li>
                <strong>no podés llevar a otras personas</strong> (ni parejas, ni hijos, ni
                mascotas) sin autorización expresa y previa del Anfitrión;
              </li>
              <li>
                respondés íntegramente por los daños que causes al inmueble, a las cosas o a las
                personas, sea por acción u omisión, dolo, culpa o negligencia;
              </li>
              <li>
                cuidás tus propias pertenencias: el Anfitrión no es depositario de tus cosas y el
                Titular no responde por pérdidas, robos, hurtos ni daños;
              </li>
              <li>
                no divulgás la dirección, las fotos del interior, los datos de acceso ni la
                información personal de nadie;
              </li>
              <li>
                evaluás vos mismo si tu estado de salud, tus alergias o tus condiciones personales
                te permiten asistir.
              </li>
            </ul>
          </Section>

          <Section id="gratuidad" n={8} title="Frens es gratis: está prohibido cobrar">
            <p>
              La Plataforma es <strong>gratuita</strong> y no procesa pagos de ninguna clase. Está
              expresamente prohibido usar Frens para cobrar, exigir o pactar un precio, alquiler,
              canon, contribución obligatoria, membresía o contraprestación por asistir a una
              juntada o por el uso del inmueble.
            </p>
            <p>
              Los aportes voluntarios entre amigos (poner para el café, traer algo) son ajenos a la
              Plataforma y quedan fuera de todo control y responsabilidad del Titular. Si un
              Anfitrión decide cobrar, lo hace por su cuenta, asume íntegramente las consecuencias
              legales, fiscales y regulatorias de esa decisión —incluida la eventual necesidad de
              habilitaciones— y mantiene indemne al Titular por todo reclamo derivado de ello.
            </p>
          </Section>

          <Section id="direccion" n={9} title="La dirección y la información privada de otros">
            <p>
              Frens muestra la dirección exacta de un lugar solamente a quienes están anotados en
              ese día. Esa información es <strong>confidencial</strong>.
            </p>
            <p>
              Está prohibido difundir, publicar, reenviar, capturar, indexar o compartir con
              terceros direcciones, fotos del interior de una casa, códigos de acceso, notas de
              llegada, listas de asistentes, datos de contacto o cualquier dato personal al que
              accedas por usar la Plataforma. El incumplimiento puede generar responsabilidad civil
              y penal a tu cargo y habilita la baja inmediata de tu cuenta.
            </p>
            <p>
              El Anfitrión reconoce que <strong>compartir su domicilio implica un riesgo</strong>,
              que esa decisión es suya, voluntaria e informada, y que el Titular no responde por la
              difusión, el uso indebido o las consecuencias de que un Usuario conozca esa
              dirección.
            </p>
          </Section>

          <Section id="riesgos" n={10} title="Asunción de riesgos">
            <p>
              <strong>
                Reconocés y aceptás que juntarse en domicilios particulares con personas que no
                administra ni controla la Plataforma implica riesgos reales.
              </strong>{" "}
              Entre otros, y sin limitación:
            </p>
            <ul>
              <li>
                lesiones, accidentes, caídas, quemaduras, intoxicaciones, mordeduras de animales,
                incapacidad o muerte;
              </li>
              <li>
                daño, pérdida, robo o hurto de tus pertenencias, de tus equipos de trabajo o de tu
                información;
              </li>
              <li>
                daños al inmueble, a sus instalaciones o a bienes de terceros presentes en el
                lugar;
              </li>
              <li>
                conductas indebidas de otros Usuarios: agresiones, amenazas, acoso, discriminación,
                hurto, estafa, suplantación de identidad o cualquier delito;
              </li>
              <li>
                contagio de enfermedades transmisibles, reacciones alérgicas o problemas de salud;
              </li>
              <li>
                acceso de terceros a información sensible tuya, incluida tu dirección o tu
                presencia en un lugar y horario determinados;
              </li>
              <li>
                fallas de conectividad, cortes de luz, ruidos, interrupciones o cualquier
                circunstancia que impida trabajar.
              </li>
            </ul>
            <p>
              <strong>
                Asumís voluntaria, libre e informadamente todos esos riesgos, en la máxima medida
                permitida por la ley aplicable
              </strong>
              , y aceptás que la decisión de participar, de abrir tu casa o de dejar entrar a una
              persona es exclusivamente tuya. Frens no toma esa decisión por vos ni te sugiere que
              alguien es confiable: solo muestra lo que los propios Usuarios cargan.
            </p>
          </Section>

          <Section id="exclusion" n={11} title="Exclusión de responsabilidad del Titular">
            <p>
              En la máxima medida permitida por la ley, el Titular, así como sus colaboradores,
              proveedores y licenciantes, <strong>no asumen responsabilidad alguna</strong> por:
            </p>
            <ul>
              <li>
                lo que ocurra <strong>antes, durante o después</strong> de cualquier juntada,
                dentro o fuera del inmueble, incluidos el traslado hacia y desde el lugar;
              </li>
              <li>
                daños a las personas o a las cosas, lesiones, muerte, robos, hurtos, incendios,
                inundaciones o cualquier siniestro ocurrido en un inmueble de un Usuario;
              </li>
              <li>
                los actos, omisiones, declaraciones, promesas, negligencia, dolo o delitos de
                cualquier Usuario o de terceros;
              </li>
              <li>
                el contenido publicado por los Usuarios y su veracidad, legalidad o exactitud,
                incluidas direcciones erróneas, fotos que no corresponden, capacidades mal
                informadas u horarios equivocados;
              </li>
              <li>
                cancelaciones, ausencias, cambios de último momento, puertas cerradas, viajes en
                vano o expectativas no cumplidas;
              </li>
              <li>
                conflictos, discusiones o rupturas de vínculos entre Usuarios, y por el uso que un
                Usuario haga de la información de otro;
              </li>
              <li>
                el incumplimiento por parte de cualquier Usuario de normas legales, reglamentarias,
                contractuales o de consorcio;
              </li>
              <li>
                la pérdida de datos, la falta de disponibilidad del servicio, los errores de
                software o la no entrega de correos electrónicos.
              </li>
            </ul>
            <p>
              <strong>
                Cualquier reclamo por hechos ocurridos en una juntada debe dirigirse contra la
                persona responsable de esos hechos, no contra el Titular ni contra la Plataforma.
              </strong>{" "}
              Frens es únicamente el medio técnico que permitió acordar el encuentro, y la relación
              causal entre ese medio y el daño es ajena al Titular.
            </p>
          </Section>

          <Section id="limitacion" n={12} title="Limitación de responsabilidad">
            <p>
              La Plataforma se presta <strong>sin costo alguno</strong> para los Usuarios. En
              consecuencia, y en la máxima medida permitida por la ley aplicable:
            </p>
            <ul>
              <li>
                la responsabilidad total y acumulada del Titular frente a un Usuario, por cualquier
                causa y cualquiera sea el título de imputación (contractual, extracontractual,
                objetiva o subjetiva), se limita al monto efectivamente pagado por ese Usuario al
                Titular en los doce meses anteriores al hecho, que en principio es{" "}
                <strong>cero</strong>;
              </li>
              <li>
                el Titular no responde en ningún caso por daños indirectos, mediatos, punitivos,
                lucro cesante, pérdida de chance, daño a la imagen, daño moral, pérdida de datos ni
                perjuicios derivados de la interrupción de actividades.
              </li>
            </ul>
            <p>
              Estas limitaciones se aplican aun cuando el Titular hubiera sido advertido de la
              posibilidad de tales daños, y subsisten a la baja de tu cuenta o a la finalización
              del servicio. Nada de lo previsto en esta cláusula limita la responsabilidad del
              Titular por dolo propio ni por los supuestos que la ley declara indisponibles (ver{" "}
              <a href="#consumidor">punto 23</a>).
            </p>
          </Section>

          <Section id="indemnidad" n={13} title="Indemnidad">
            <p>
              Te obligás a <strong>mantener indemne y a defender al Titular</strong>, sus
              colaboradores y proveedores frente a cualquier reclamo, demanda, denuncia, multa,
              sanción, pérdida, daño, costo o gasto (incluidos honorarios de abogados y costas
              judiciales) que resulte de:
            </p>
            <ul>
              <li>tu uso de la Plataforma o el de quien acceda con tu cuenta;</li>
              <li>
                lo que ocurra en tu casa o en la casa que visitaste, incluidos daños a personas o
                bienes;
              </li>
              <li>
                el contenido que publicaste, incluidas fotos, direcciones o datos de terceros;
              </li>
              <li>
                el incumplimiento de estos Términos, de la ley o de derechos de terceros por parte
                tuya.
              </li>
            </ul>
            <p>
              Si un tercero reclama al Titular por algo atribuible a vos, deberás asumir su defensa
              a tu costa o reembolsarle íntegramente lo que deba pagar.
            </p>
          </Section>

          <Section id="sin-garantias" n={14} title="Servicio tal cual, sin garantías">
            <p>
              La Plataforma se ofrece <strong>tal como está</strong> y{" "}
              <strong>según disponibilidad</strong>, sin garantías de ninguna clase, expresas o
              implícitas, incluidas —sin limitación— las de idoneidad para un fin determinado,
              continuidad, ausencia de errores o seguridad.
            </p>
            <p>
              En particular, el Titular <strong>no garantiza la entrega de correos</strong>: los
              avisos de apertura de un día, de cancelación y los recordatorios previos pueden
              demorarse, terminar en spam o no llegar nunca por causas ajenas al Titular.{" "}
              <strong>No dependas de esos correos</strong>; confirmá siempre por tu cuenta con la
              otra persona. El Titular tampoco garantiza la conservación ni la integridad de la
              información cargada, ni la disponibilidad del servicio en un momento determinado.
            </p>
          </Section>

          <Section id="contenido" n={15} title="Contenido que subís">
            <p>
              Seguís siendo titular del contenido que publicás (fotos, textos, nombre de tu lugar,
              notas). Al subirlo otorgás al Titular una licencia gratuita, mundial y no exclusiva
              para almacenarlo, reproducirlo y mostrarlo dentro de la Plataforma con el único fin
              de hacerla funcionar.
            </p>
            <p>Al publicar contenido garantizás que:</p>
            <ul>
              <li>tenés todos los derechos necesarios sobre él;</li>
              <li>
                contás con el consentimiento de las personas que aparecen en las fotos, conforme al
                artículo 53 del Código Civil y Comercial de la Nación;
              </li>
              <li>
                no infringe derechos de propiedad intelectual, industrial, honor, imagen o
                intimidad de terceros;
              </li>
              <li>
                no es ilícito, engañoso, discriminatorio, violento, sexual, ofensivo ni contrario a
                la moral y las buenas costumbres.
              </li>
            </ul>
            <p>
              El Titular <strong>no tiene obligación de revisar ni moderar</strong> el contenido,
              pero puede eliminarlo o restringirlo en cualquier momento, sin aviso previo y sin
              responsabilidad. El ejercicio ocasional de esa facultad no genera un deber de control
              ni transforma al Titular en responsable del contenido de los Usuarios.
            </p>
          </Section>

          <Section id="conducta" n={16} title="Conducta prohibida">
            <p>Al usar Frens te comprometés a no:</p>
            <ul>
              <li>
                usar la Plataforma para actividades ilícitas, peligrosas, comerciales, políticas,
                proselitistas o de venta;
              </li>
              <li>
                suplantar identidades, crear cuentas falsas o falsear tu edad, tu nombre o tu
                domicilio;
              </li>
              <li>
                acosar, hostigar, amenazar, discriminar, difamar o intimidar a otros Usuarios,
                dentro o fuera de la Plataforma;
              </li>
              <li>
                usar la Plataforma para contactar personas con fines románticos no consentidos,
                proselitismo, captación o reclutamiento;
              </li>
              <li>
                recolectar datos de otros Usuarios de forma automatizada (scraping, bots,
                crawlers), ni acceder a áreas no autorizadas, vulnerar medidas de seguridad,
                sobrecargar la infraestructura o realizar ingeniería inversa;
              </li>
              <li>divulgar direcciones o información privada de otros Usuarios;</li>
              <li>revender, ceder o comercializar tu acceso, tus invitaciones o tu lugar.</li>
            </ul>
            <p>
              Si sufrís una situación de riesgo o presenciás un delito,{" "}
              <strong>contactá de inmediato a las autoridades</strong> (911 en Argentina). Frens no
              es un servicio de emergencias, no monitorea juntadas en tiempo real y no puede
              intervenir.
            </p>
          </Section>

          <Section id="moderacion" n={17} title="Moderación, suspensión y baja">
            <p>
              El Titular puede, discrecionalmente y sin necesidad de aviso previo ni expresión de
              causa: suspender o eliminar cuentas, borrar contenido, cancelar días publicados,
              deshacer vínculos entre Usuarios o restringir el acceso a la Plataforma. Esas medidas
              no generan derecho a indemnización ni reclamo alguno.
            </p>
            <p>
              Podés dar de baja tu cuenta cuando quieras escribiendo a{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. La baja no afecta las
              obligaciones ya asumidas ni las cláusulas que por su naturaleza sobreviven
              (responsabilidad, indemnidad, jurisdicción).
            </p>
          </Section>

          <Section id="datos" n={18} title="Datos personales y privacidad">
            <p>
              El tratamiento de datos personales se rige por la Ley 25.326 de Protección de los
              Datos Personales de la República Argentina y su normativa complementaria.
            </p>
            <p>
              <strong>Qué datos tratamos:</strong> correo electrónico, nombre, nombre de usuario,
              foto de perfil, biografía, vínculos de amistad, círculos, dirección y datos del lugar
              que publiques como Anfitrión, asistencias a juntadas y mensajes de feedback que
              envíes.
            </p>
            <p>
              <strong>Para qué:</strong> exclusivamente para operar la Plataforma —autenticarte,
              mostrar juntadas a la audiencia elegida, enviar avisos y recordatorios, y mejorar el
              servicio—. No vendemos ni cedemos datos personales con fines publicitarios.
            </p>
            <p>
              <strong>Quién los ve:</strong> tu perfil es visible para otros Usuarios de la red. Tu
              dirección se muestra únicamente a las personas anotadas en tus días abiertos. El
              Titular no controla lo que esas personas hagan luego con esa información.
            </p>
            <p>
              <strong>Proveedores:</strong> la Plataforma se apoya en servicios de terceros para
              alojamiento, base de datos, envío de correos, almacenamiento de imágenes y mapas, que
              pueden implicar transferencia internacional de datos. Al usar Frens prestás
              conformidad con ese tratamiento.
            </p>
            <p>
              <strong>Tus derechos:</strong> podés solicitar acceso, rectificación, actualización y
              supresión de tus datos escribiendo a{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. El titular de los datos
              tiene derecho a solicitar el acceso en forma gratuita a intervalos no inferiores a
              seis meses, salvo interés legítimo (art. 14, inc. 3, Ley 25.326). La Agencia de
              Acceso a la Información Pública, órgano de control de la Ley 25.326, atiende las
              denuncias y reclamos que se interpongan con relación al incumplimiento de las normas
              sobre protección de datos personales.
            </p>
            <p>
              <strong>Seguridad:</strong> aplicamos medidas razonables, pero{" "}
              <strong>ningún sistema es totalmente seguro</strong>. El Titular no garantiza la
              inviolabilidad de la Plataforma ni responde por accesos no autorizados, filtraciones
              o ataques informáticos que ocurran pese a la diligencia aplicada.
            </p>
          </Section>

          <Section id="menores" n={19} title="Menores de edad">
            <p>
              Frens no está dirigida a menores de 18 años y no se permite su registro. Si el
              Titular detecta una cuenta de un menor, la eliminará.
            </p>
            <p>
              Si un Anfitrión permite la presencia de menores en su domicilio, lo hace bajo su
              exclusiva responsabilidad y la de los adultos a cargo. El Titular no responde en
              ninguna circunstancia por hechos que involucren a menores de edad.
            </p>
          </Section>

          <Section id="disponibilidad" n={20} title="Disponibilidad del servicio y fin del proyecto">
            <p>
              Frens es un <strong>proyecto personal, sin fines de lucro y en desarrollo</strong>. El
              Titular puede modificar, suspender, limitar o discontinuar la Plataforma —total o
              parcialmente, de forma temporal o definitiva— en cualquier momento, sin aviso previo
              y sin que ello genere derecho a compensación, indemnización o reclamo alguno.
            </p>
            <p>
              Si el proyecto se discontinúa, los datos podrán ser eliminados. Guardá por tu cuenta
              la información que te importe.
            </p>
          </Section>

          <Section id="propiedad" n={21} title="Propiedad intelectual">
            <p>
              El software, el diseño, la marca, los textos y todo elemento de la Plataforma
              pertenecen al Titular o a sus licenciantes. No se otorga más licencia que la de usar
              la Plataforma conforme a estos Términos. Queda prohibido copiar, modificar,
              distribuir, descompilar o crear obras derivadas sin autorización previa y por
              escrito.
            </p>
          </Section>

          <Section id="cambios" n={22} title="Cambios en estos Términos">
            <p>
              El Titular puede modificar estos Términos en cualquier momento. La versión vigente es
              siempre la publicada en esta página, con su número de versión y fecha.
            </p>
            <p>
              Cuando se publique una versión nueva,{" "}
              <strong>
                la Plataforma te pedirá que la aceptes expresamente antes de seguir usándola
              </strong>{" "}
              y registrará esa nueva aceptación. El uso posterior a un cambio implica la
              aceptación de la versión vigente. Si no aceptás los cambios, dejá de usar Frens y
              solicitá la baja de tu cuenta.
            </p>
          </Section>

          <Section id="consumidor" n={23} title="Derechos irrenunciables del consumidor">
            <p>
              Ninguna disposición de estos Términos debe interpretarse como una renuncia a los
              derechos que la Ley 24.240 de Defensa del Consumidor, el Código Civil y Comercial de
              la Nación u otras normas de orden público reconozcan a los Usuarios con carácter
              indisponible, incluidas las limitaciones a la dispensa anticipada de responsabilidad
              por daños a la persona.
            </p>
            <p>
              Las exclusiones y limitaciones previstas en los puntos{" "}
              <a href="#riesgos">10</a>, <a href="#exclusion">11</a> y{" "}
              <a href="#limitacion">12</a> se aplican en la máxima medida que la ley permita, y su
              eventual inaplicabilidad parcial no afecta la validez del resto del documento.
            </p>
          </Section>

          <Section id="ley" n={24} title="Ley aplicable y jurisdicción">
            <p>
              Estos Términos se rigen por las leyes de la <strong>República Argentina</strong>.
            </p>
            <p>
              Toda controversia derivada de estos Términos o del uso de la Plataforma se someterá a
              los tribunales ordinarios competentes de la República Argentina que correspondan al
              domicilio del Titular, salvo que una norma de orden público —como la legislación de
              defensa del consumidor— establezca otra jurisdicción a favor del Usuario, en cuyo
              caso se estará a lo que dicha norma disponga.
            </p>
            <p>
              Antes de iniciar cualquier acción, las partes procurarán resolver el conflicto de
              buena fe escribiendo a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          </Section>

          <Section id="generales" n={25} title="Disposiciones generales">
            <ul>
              <li>
                <strong>Divisibilidad:</strong> si una cláusula se declara nula, inválida o
                inaplicable, se la interpretará con el alcance máximo admitido por la ley y las
                demás cláusulas mantendrán plena vigencia.
              </li>
              <li>
                <strong>No renuncia:</strong> la tolerancia o la falta de ejercicio de un derecho
                por parte del Titular no implica renuncia a ese derecho ni a ejercerlo en el
                futuro.
              </li>
              <li>
                <strong>Cesión:</strong> no podés ceder tu posición en este acuerdo. El Titular sí
                puede cederla a un tercero que continúe el proyecto, con aviso publicado en la
                Plataforma.
              </li>
              <li>
                <strong>Supervivencia:</strong> las cláusulas sobre asunción de riesgos, exclusión
                y limitación de responsabilidad, indemnidad, propiedad intelectual, ley aplicable y
                jurisdicción sobreviven a la terminación de tu cuenta.
              </li>
              <li>
                <strong>Acuerdo íntegro:</strong> estos Términos constituyen el acuerdo completo
                entre vos y el Titular respecto del uso de la Plataforma y reemplazan cualquier
                entendimiento previo.
              </li>
              <li>
                <strong>Notificaciones:</strong> las comunicaciones se cursarán al correo
                electrónico asociado a tu cuenta y se tendrán por recibidas al ser enviadas.
              </li>
              <li>
                <strong>Idioma:</strong> la versión en español es la única con valor legal.
              </li>
            </ul>
          </Section>

          <Section id="contacto" n={26} title="Contacto">
            <p>
              Por consultas, reclamos, denuncias de conducta indebida, pedidos de baja o ejercicio
              de derechos sobre tus datos personales, escribí a{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          </Section>
        </div>

        <footer className="mt-14 border-t border-[rgba(60,40,20,0.14)] pt-8 text-center font-mono text-[13px] font-medium text-[oklch(0.5_0.03_60)]">
          <p>
            Coworking Frens · Términos y Condiciones v{VERSION} · {LAST_UPDATED}
          </p>
          <p className="mt-2">
            <Link href="/" className="transition-colors hover:text-ink">
              Volver al inicio
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
