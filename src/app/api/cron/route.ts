import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { materializeRules } from "@/lib/days";
import { sendEmail } from "@/lib/email";
import { addDays, todayBA } from "@/lib/tz";
import { appUrl } from "@/lib/url";

// Daily job: materialize recurring rules + send day-before reminders.
// Call once a day (e.g. Vercel cron or `curl "$APP_URL/api/cron?secret=$CRON_SECRET"`).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given =
    req.nextUrl.searchParams.get("secret") ??
    req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret && given !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await materializeRules();

  const tomorrow = addDays(todayBA(), 1);
  const days = await prisma.coworkDay.findMany({
    where: { date: tomorrow, status: "open", reminderSent: false },
    include: {
      host: true,
      place: true,
      attendances: { include: { user: true } },
    },
  });

  let reminders = 0;
  for (const day of days) {
    const names = day.attendances.map((a) => a.user.name?.split(" ")[0]).filter(Boolean);
    const who =
      names.length === 0
        ? "Nobody has claimed a spot yet."
        : `Coming: ${names.join(", ")}.`;
    const recipients = [day.host.email, ...day.attendances.map((a) => a.user.email)];
    await sendEmail(
      recipients,
      `Tomorrow: coworking at ${day.place.nickname}, ${day.startTime}–${day.endTime}`,
      `Reminder: ${day.host.name} is hosting at ${day.place.nickname} tomorrow (${day.date}), ${day.startTime}–${day.endTime}. ${who}\n\n${appUrl()}/day/${day.id}`
    );
    await prisma.coworkDay.update({ where: { id: day.id }, data: { reminderSent: true } });
    reminders++;
  }

  return NextResponse.json({ ok: true, remindersSent: reminders });
}
