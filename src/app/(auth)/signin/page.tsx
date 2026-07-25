import Link from "next/link";
import { signIn } from "@/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const redirectTo = callbackUrl ?? "/juntadas";

  return (
    <div className="mt-16 text-center">
      <div className="mb-4 flex items-center justify-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay font-display text-xl font-bold text-white">
          F
        </span>
        <span className="font-display text-3xl font-bold tracking-tight text-ink">Frens</span>
      </div>
      <p className="text-faded">
        La oficina es la casa de tus amigos. Mirá quién hostea, sumate y aparecé.
      </p>

      <div className="card mt-8 space-y-4 p-5 text-left">
        {error && (
          <p className="rounded-xl bg-clay/10 px-3 py-2 text-center text-sm font-semibold text-clay">
            No pudimos enviarte el link. Revisá el mail y probá de nuevo.
          </p>
        )}

        <form
          className="space-y-2"
          action={async (formData: FormData) => {
            "use server";
            await signIn("resend", {
              email: String(formData.get("email") ?? "").trim(),
              redirectTo,
            });
          }}
        >
          <label htmlFor="signin-email" className="label">
            Tu email
          </label>
          <input
            id="signin-email"
            name="email"
            type="email"
            required
            placeholder="vos@email.com"
            className="input"
          />
          <button className="btn-primary w-full py-3">Mandame un link para entrar</button>
          <p className="pt-1 text-center text-xs text-faded">
            Te llega un link al mail. Tocalo y ya estás adentro — sin contraseñas.
          </p>
          <p className="text-center text-xs text-faded">
            Al entrar aceptás los{" "}
            <Link href="/terminos" className="font-semibold text-clay underline">
              Términos y Condiciones
            </Link>
            .
          </p>
        </form>
      </div>
    </div>
  );
}
