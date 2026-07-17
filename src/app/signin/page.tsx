import { signIn } from "@/auth";

const devLoginEnabled =
  process.env.NODE_ENV === "development" || process.env.ALLOW_DEV_LOGIN === "1";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const redirectTo = callbackUrl ?? "/";
  const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID);

  return (
    <div className="mx-auto mt-16 max-w-sm text-center">
      <h1 className="font-display text-5xl font-semibold italic tracking-tight">
        coworking <span className="text-clay">frens</span>
      </h1>
      <p className="mt-3 text-faded">
        Your friends&apos; houses are the office. See who&apos;s hosting, claim a desk, show up.
      </p>

      <div className="card mt-8 space-y-4 text-left">
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo });
          }}
        >
          <button className="btn-primary w-full py-3" disabled={!googleConfigured}>
            Continue with Google
          </button>
          {!googleConfigured && (
            <p className="mt-2 text-center text-xs text-faded">
              (Google sign-in needs AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET in .env)
            </p>
          )}
        </form>

        {devLoginEnabled && (
          <>
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-faded">
              <span className="h-px flex-1 bg-line" /> dev login <span className="h-px flex-1 bg-line" />
            </div>
            <form
              className="space-y-2"
              action={async (formData: FormData) => {
                "use server";
                await signIn("dev-login", {
                  email: String(formData.get("email") ?? ""),
                  name: String(formData.get("name") ?? ""),
                  redirectTo,
                });
              }}
            >
              <input name="name" placeholder="Name" className="input" />
              <input name="email" type="email" required placeholder="Email" className="input" />
              <button className="btn-ghost w-full">Sign in as this person</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
