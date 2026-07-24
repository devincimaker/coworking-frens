import { encode } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SESSION_MAX_AGE = 60 * 60 * 24 * 90;

function safeRedirectPath(raw: string | null) {
  const value = String(raw ?? "/juntadas").trim();
  return value.startsWith("/") && !value.startsWith("//") ? value : "/juntadas";
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const email = request.nextUrl.searchParams.get("email") ?? "ana@test.dev";
  const user = await prisma.user.findFirst({
    where: { email, onboardedAt: { not: null } },
    select: { id: true, name: true, email: true, image: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Seeded onboarded user not found. Run /api/dev/seed first." },
      { status: 404 }
    );
  }

  const secureCookie = request.nextUrl.protocol === "https:";
  const cookieName = `${secureCookie ? "__Secure-" : ""}authjs.session-token`;
  const token = await encode({
    secret: process.env.AUTH_SECRET!,
    salt: cookieName,
    maxAge: SESSION_MAX_AGE,
    token: {
      id: user.id,
      sub: user.id,
      name: user.name,
      email: user.email,
      picture: user.image,
    },
  });

  const response = NextResponse.redirect(
    new URL(safeRedirectPath(request.nextUrl.searchParams.get("redirectTo")), request.url)
  );
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: secureCookie,
  });
  return response;
}
