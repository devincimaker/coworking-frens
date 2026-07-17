import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const devLoginEnabled =
  process.env.NODE_ENV === "development" || process.env.ALLOW_DEV_LOGIN === "1";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    Google,
    ...(devLoginEnabled
      ? [
          Credentials({
            id: "dev-login",
            name: "Dev login",
            credentials: {
              email: { label: "Email" },
              name: { label: "Name" },
            },
            async authorize(credentials) {
              const email = String(credentials?.email ?? "").trim().toLowerCase();
              const name = String(credentials?.name ?? "").trim();
              if (!email.includes("@")) return null;
              const user = await prisma.user.upsert({
                where: { email },
                update: name ? { name } : {},
                create: { email, name: name || email.split("@")[0] },
              });
              return { id: user.id, email: user.email, name: user.name, image: user.image };
            },
          }),
        ]
      : []),
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

/** Like auth(), but throws if there is no signed-in user. */
export async function requireUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Not signed in");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("User not found");
  return user;
}
