import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { makeFriends } from "@/lib/friends";
import { createDay, materializeRules } from "@/lib/days";
import { addDays, todayBA } from "@/lib/tz";

// Dev-only: seed a realistic friend group to click around with.
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const mk = (email: string, name: string) =>
    prisma.user.upsert({ where: { email }, update: {}, create: { email, name } });
  const ana = await mk("ana@test.dev", "Ana Suarez");
  const marco = await mk("marco@test.dev", "Marco Gilardi");
  const lea = await mk("lea@test.dev", "Lea Kaplan");

  await makeFriends(ana.id, marco.id);
  await makeFriends(ana.id, lea.id);
  await makeFriends(marco.id, lea.id);

  await prisma.place.upsert({
    where: { hostId: ana.id },
    update: {},
    create: {
      hostId: ana.id,
      nickname: "El Nido",
      address: "Gorriti 4380, Palermo",
      arrivalNotes: "Ring 3B. Dog is friendly. Wifi pass on the fridge.",
      amenities: "fast wifi, 2 monitors, espresso, balcony",
      defaultCapacity: 3,
    },
  });

  // Recurring: Ana opens Tue+Thu to all friends
  const rule = await prisma.availabilityRule.findFirst({ where: { hostId: ana.id } });
  if (!rule) {
    await prisma.availabilityRule.create({
      data: { hostId: ana.id, weekdays: "2,4", startTime: "09:00", endTime: "17:00", capacity: 3 },
    });
  }
  await materializeRules();

  // Circle-only one-off: Ana's "deep work" circle = just Marco (Lea must NOT see this day)
  let circle = await prisma.circle.findFirst({ where: { ownerId: ana.id, name: "deep work" } });
  if (!circle) {
    circle = await prisma.circle.create({ data: { ownerId: ana.id, name: "deep work" } });
    await prisma.circleMember.create({ data: { circleId: circle.id, userId: marco.id } });
    await createDay({
      hostId: ana.id,
      date: addDays(todayBA(), 1),
      startTime: "10:00",
      endTime: "16:00",
      capacity: 2,
      circleId: circle.id,
    });
  }

  // Marco hosts too: his own place, open Mon+Wed+Fri, 2 desks
  await prisma.place.upsert({
    where: { hostId: marco.id },
    update: {},
    create: {
      hostId: marco.id,
      nickname: "La Terraza",
      address: "Av. Caseros 750, San Telmo",
      arrivalNotes: "Portero knows, say you're with Marco. Rooftop if it's sunny.",
      amenities: "wifi, standing desk, mate, rooftop",
      defaultCapacity: 2,
    },
  });
  const marcoRule = await prisma.availabilityRule.findFirst({ where: { hostId: marco.id } });
  if (!marcoRule) {
    await prisma.availabilityRule.create({
      data: { hostId: marco.id, weekdays: "1,3,5", startTime: "10:00", endTime: "18:00", capacity: 2 },
    });
  }
  await materializeRules();

  // Ana claims a spot on Marco's first upcoming day
  const marcoDay = await prisma.coworkDay.findFirst({
    where: { hostId: marco.id, status: "open", date: { gte: todayBA() } },
    orderBy: { date: "asc" },
  });
  if (marcoDay) {
    await prisma.attendance.upsert({
      where: { dayId_userId: { dayId: marcoDay.id, userId: ana.id } },
      update: {},
      create: { dayId: marcoDay.id, userId: ana.id },
    });
  }

  // Marco claims a spot on Ana's first upcoming rule day
  const firstDay = await prisma.coworkDay.findFirst({
    where: { hostId: ana.id, ruleId: { not: null }, status: "open", date: { gte: todayBA() } },
    orderBy: { date: "asc" },
  });
  if (firstDay) {
    await prisma.attendance.upsert({
      where: { dayId_userId: { dayId: firstDay.id, userId: marco.id } },
      update: {},
      create: { dayId: firstDay.id, userId: marco.id },
    });
  }

  const days = await prisma.coworkDay.count();
  return NextResponse.json({ ok: true, users: 3, coworkDays: days });
}
