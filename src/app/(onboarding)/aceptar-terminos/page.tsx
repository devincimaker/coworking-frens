import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signOutToHome } from "@/lib/auth-actions";
import { prisma } from "@/lib/prisma";
import { hasAcceptedCurrentTerms, TERMS_UPDATED_AT, TERMS_VERSION } from "@/lib/terms";
import { AcceptTermsForm } from "./accept-terms-form";

function safePath(raw?: string) {
  return raw?.startsWith("/") && !raw.startsWith("//") ? raw : "/juntadas";
}

export default async function AcceptTermsPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const destination = safePath(callbackUrl);
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(destination)}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { termsAcceptedAt: true, termsVersion: true },
  });

  if (!user) redirect("/signin"); // stale session: the signed-in id no longer exists
  if (hasAcceptedCurrentTerms(user)) redirect(destination);

  // Someone who accepted an older version is being asked again, not for the first time.
  const isUpdate = Boolean(user.termsAcceptedAt);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-md flex-col justify-center py-8">
      <div className="mb-6 flex items-center justify-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay font-display text-xl font-bold text-on-action">
          F
        </span>
        <span className="font-display text-3xl font-bold tracking-tight text-ink">Frens</span>
      </div>

      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          {isUpdate ? "Actualizamos los Términos" : "Un paso y entrás"}
        </h1>
        <p className="mt-2 text-[15px] leading-7 text-faded">
          {isUpdate
            ? `Hay una versión nueva (v${TERMS_VERSION}, ${TERMS_UPDATED_AT}). Aceptala para seguir.`
            : "Aceptá los Términos y Condiciones para entrar."}
        </p>
      </div>

      <AcceptTermsForm callbackUrl={destination} />

      <form action={signOutToHome} className="mt-6 text-center">
        <button className="text-sm font-semibold text-faded underline">Cerrar sesión</button>
      </form>
    </div>
  );
}
