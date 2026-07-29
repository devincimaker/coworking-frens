import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/auth";
import { isFeedbackAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type FeedbackPageProps = {
  searchParams: Promise<{ view?: string }>;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

async function setFeedbackHandled(formData: FormData) {
  "use server";

  const user = await requireOnboardedUser();
  if (!isFeedbackAdminEmail(user.email)) notFound();

  const feedbackId = String(formData.get("feedbackId") ?? "");
  if (!feedbackId) return;

  await prisma.feedback.updateMany({
    where: { id: feedbackId },
    data: {
      handledAt: String(formData.get("handled") ?? "") === "true" ? new Date() : null,
    },
  });

  revalidatePath("/admin/feedback");
}

export default async function FeedbackAdminPage({ searchParams }: FeedbackPageProps) {
  const user = await requireOnboardedUser();
  if (!isFeedbackAdminEmail(user.email)) notFound();

  const { view } = await searchParams;
  const showingHandled = view === "handled";

  const [feedback, activeCount, handledCount] = await Promise.all([
    prisma.feedback.findMany({
      where: { handledAt: showingHandled ? { not: null } : null },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, username: true, email: true } },
      },
    }),
    prisma.feedback.count({ where: { handledAt: null } }),
    prisma.feedback.count({ where: { handledAt: { not: null } } }),
  ]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Feedback</h1>
          <p className="mt-2 text-[15px] text-faded">
            Mensajes que entran desde el botón flotante.
          </p>
        </div>
        <div className="flex rounded-2xl border border-line bg-surface p-1">
          <Link
            href="/admin/feedback"
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              showingHandled ? "text-faded hover:text-ink" : "bg-ink text-paper"
            }`}
          >
            Activos ({activeCount})
          </Link>
          <Link
            href="/admin/feedback?view=handled"
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              showingHandled ? "bg-ink text-paper" : "text-faded hover:text-ink"
            }`}
          >
            Listos ({handledCount})
          </Link>
        </div>
      </div>

      {feedback.length === 0 ? (
        <section className="card mt-7 p-8 text-center">
          <p className="font-display text-xl font-semibold text-ink">
            {showingHandled ? "Todavía no marcaste nada como listo." : "No hay feedback activo."}
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-faded">
            {showingHandled
              ? "Cuando cierres un mensaje, va a quedar guardado acá."
              : "Los mensajes nuevos del widget aparecen en esta lista."}
          </p>
        </section>
      ) : (
        <div className="mt-7 grid gap-3">
          {feedback.map((item) => {
            const displayEmail = item.email ?? item.user?.email ?? null;
            const displayName = item.user?.name ?? item.user?.username ?? null;
            const handled = Boolean(item.handledAt);

            return (
              <article key={item.id} className="panel p-4 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {displayEmail ? (
                        <a
                          href={`mailto:${displayEmail}`}
                          className="break-all text-sm font-semibold text-clay hover:text-clay-deep"
                        >
                          {displayEmail}
                        </a>
                      ) : (
                        <span className="text-sm font-semibold text-faded">Sin email</span>
                      )}
                      {displayName && (
                        <span className="font-mono text-[11px] text-faded">
                          {displayName}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {item.page && (
                        <Link
                          href={item.page}
                          className="amenity break-all hover:text-clay"
                        >
                          {item.page}
                        </Link>
                      )}
                      <span className="amenity">{formatDate(item.createdAt)}</span>
                      {item.handledAt && (
                        <span className="amenity">listo {formatDate(item.handledAt)}</span>
                      )}
                    </div>
                  </div>
                  <form action={setFeedbackHandled} className="shrink-0">
                    <input type="hidden" name="feedbackId" value={item.id} />
                    <input type="hidden" name="handled" value={handled ? "false" : "true"} />
                    <button className={handled ? "btn-ghost" : "btn-primary"}>
                      {handled ? "Reabrir" : "Marcar listo"}
                    </button>
                  </form>
                </div>

                <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink">
                  {item.message}
                </p>

                {item.imageUrl && (
                  <a
                    href={item.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 block w-fit overflow-hidden rounded-xl border border-line bg-paper transition-opacity hover:opacity-90"
                    aria-label="Abrir imagen adjunta en una pestaña nueva"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt="Imagen adjunta al feedback"
                      className="max-h-80 max-w-full object-contain sm:max-w-xl"
                    />
                  </a>
                )}

                {item.userAgent && (
                  <p className="mt-4 truncate border-t border-line pt-3 font-mono text-[11px] text-faded">
                    {item.userAgent}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
