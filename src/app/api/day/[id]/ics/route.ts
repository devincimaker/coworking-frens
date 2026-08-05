import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { buildIcs, calendarEventFor } from "@/lib/calendar";
import { dayForUser } from "@/lib/queries";

/** Everything unavailable answers the same way: the file carries a home address. */
function notFound() {
  return new Response("Not found", { status: 404 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const { id } = await params;
  // Same gate as the day page: dayForUser already scopes to host-or-audience, so
  // someone outside the circle gets what a stranger gets and learns nothing from
  // the difference.
  const day = await dayForUser(id, session.user.id);
  if (!day || day.status === "cancelled") return notFound();

  const ics = buildIcs(calendarEventFor(day), new Date());

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="juntada-${day.date}.ics"`,
      // Never let a shared cache hand one person's address to the next requester.
      "Cache-Control": "no-store",
    },
  });
}
