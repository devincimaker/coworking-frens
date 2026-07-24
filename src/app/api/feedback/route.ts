import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_OPTIONAL_LENGTH = 320;
const MAX_USER_AGENT_LENGTH = 500;

function normalizeOptionalText(value: unknown, maxLength = MAX_OPTIONAL_LENGTH) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function normalizeEmail(value: unknown) {
  const email = normalizeOptionalText(value);
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function normalizePage(value: unknown) {
  const page = normalizeOptionalText(value);
  if (!page || !page.startsWith("/") || page.startsWith("//")) return null;
  return page;
}

function feedbackRecipients() {
  return String(process.env.FEEDBACK_TO_EMAIL ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function notifyFeedbackOwner({
  email,
  message,
  page,
}: {
  email: string | null;
  message: string;
  page: string | null;
}) {
  const recipients = feedbackRecipients();
  if (recipients.length === 0) return;

  await sendEmail(
    recipients,
    "Nuevo feedback en Coworking Frens",
    [
      `De: ${email ?? "sin email"}`,
      `Página: ${page ?? "sin página"}`,
      "",
      message,
    ].join("\n")
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const message = normalizeOptionalText(payload.message, MAX_MESSAGE_LENGTH);
  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const session = await auth();
  let userId: string | null = null;
  let sessionEmail = session?.user?.email ?? null;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true },
    });
    userId = user?.id ?? null;
    sessionEmail = user?.email ?? sessionEmail;
  }

  const email = normalizeEmail(payload.email) ?? sessionEmail;
  const page = normalizePage(payload.page);
  const userAgent = normalizeOptionalText(
    request.headers.get("user-agent"),
    MAX_USER_AGENT_LENGTH
  );

  try {
    await prisma.feedback.create({
      data: {
        message,
        email,
        page,
        userAgent,
        userId,
      },
    });
  } catch (error) {
    console.error("feedback create failed", error);
    return NextResponse.json({ error: "failed to save feedback" }, { status: 500 });
  }

  await notifyFeedbackOwner({ email, message, page });

  return NextResponse.json({ ok: true });
}
