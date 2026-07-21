import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { isOnboardingComplete } from "@/lib/profile";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // JWT sessions so a magic link only has to be clicked once — the session cookie
  // then keeps people signed in for maxAge (90 days), refreshed on each visit.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 90 },
  pages: { signIn: "/signin", verifyRequest: "/signin/revisa-tu-correo" },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM ?? "Coworking Frens <onboarding@resend.dev>",
      // Reuse the app's Resend helper: Spanish-branded, and with no RESEND_API_KEY
      // (local dev) it logs the link to the server console instead of sending.
      async sendVerificationRequest({ identifier, url }) {
        await sendEmail(
          [identifier],
          "Tu link para entrar a Coworking Frens",
          `Tocá este link para entrar (vence en 24 h):\n\n${url}\n\nSi no pediste esto, ignorá este mail.`,
          { throwOnError: true }
        );
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
});

/** Like auth(), but redirects to sign-in if there is no signed-in (and still-existing) user. */
export async function requireUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/signin");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) redirect("/signin"); // stale session: the signed-in id no longer exists
  return user;
}

/** Like requireUser(), but redirects first-run users into onboarding. */
export async function requireOnboardedUser() {
  const user = await requireUser();
  if (!isOnboardingComplete(user)) redirect("/onboarding");
  return user;
}
