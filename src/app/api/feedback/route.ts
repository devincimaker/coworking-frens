import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_OPTIONAL_LENGTH = 320;
const MAX_USER_AGENT_LENGTH = 500;
const MAX_URL_LENGTH = 2048;

function normalizeOptionalText(value: unknown, maxLength = MAX_OPTIONAL_LENGTH) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function normalizePage(value: unknown) {
  const page = normalizeOptionalText(value);
  if (!page || !page.startsWith("/") || page.startsWith("//")) return null;
  return page;
}

function normalizeFeedbackImageUrl(value: unknown) {
  const rawUrl = normalizeOptionalText(value, MAX_URL_LENGTH);
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return null;
    if (!url.hostname.endsWith(".blob.vercel-storage.com")) return null;
    if (!url.pathname.startsWith("/feedback/")) return null;
    return url.toString();
  } catch {
    return null;
  }
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
  imageUrl,
}: {
  email: string | null;
  message: string;
  page: string | null;
  imageUrl: string | null;
}) {
  const recipients = feedbackRecipients();
  if (recipients.length === 0) return;

  await sendEmail(
    recipients,
    "Nuevo feedback en Coworking Frens",
    [
      `De: ${email ?? "sin email"}`,
      `Página: ${page ?? "sin página"}`,
      `Imagen: ${imageUrl ?? "sin imagen"}`,
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

  const email = sessionEmail;
  const page = normalizePage(payload.page);
  const imageUrl = normalizeFeedbackImageUrl(payload.imageUrl);
  const userAgent = normalizeOptionalText(
    request.headers.get("user-agent"),
    MAX_USER_AGENT_LENGTH
  );

  try {
    await prisma.feedback.create({
      data: {
        message,
        email,
        imageUrl,
        page,
        userAgent,
        userId,
      },
    });
  } catch (error) {
    console.error("feedback create failed", error);
    return NextResponse.json({ error: "failed to save feedback" }, { status: 500 });
  }

  await notifyFeedbackOwner({ email, message, page, imageUrl });

  return NextResponse.json({ ok: true });
}
