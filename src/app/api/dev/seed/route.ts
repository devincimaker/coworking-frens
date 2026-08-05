import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { makeFriends } from "@/lib/friends";
import { AUDIENCE_FRIENDS_OF_FRIENDS } from "@/lib/audience";
import { createDay, materializeRules } from "@/lib/days";
import { TERMS_VERSION } from "@/lib/terms";
import { addDays, todayBA } from "@/lib/tz";

// Dev-only: seed a realistic friend group to click around with.
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Seeded users accept the current Terms so local clicking around is not gated.
  const mk = (email: string, name: string, username: string, image: string, bio: string) => {
    const fields = {
      name,
      username,
      image,
      bio,
      onboardedAt: new Date(),
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
    };
    return prisma.user.upsert({
      where: { email },
      update: fields,
      create: { email, ...fields },
    });
  };
  const ana = await mk(
    "ana@test.dev",
    "Ana Suarez",
    "ana",
    "https://i.pravatar.cc/160?u=ana",
    "Productora de foco, café y sobremesa larga."
  );
  const marco = await mk(
    "marco@test.dev",
    "Marco Gilardi",
    "marco",
    "https://i.pravatar.cc/160?u=marco",
    "Diseño, calls cortas y una terraza cuando sale el sol."
  );
  const lea = await mk(
    "lea@test.dev",
    "Lea Kaplan",
    "lea",
    "https://i.pravatar.cc/160?u=lea",
    "Escribo mejor con silencio, mate y playlists tranquilas."
  );
  // Valen is friends with Marco only: she reaches Ana's friends-of-friends day
  // through that single hop and nothing else of Ana's.
  const valen = await mk(
    "valen@test.dev",
    "Valen Ortiz",
    "valenortiz",
    "https://i.pravatar.cc/160?u=valenortiz",
    "Front-end y cerámica; laburo mejor con gente cerca."
  );

  await makeFriends(ana.id, marco.id);
  await makeFriends(ana.id, lea.id);
  await makeFriends(marco.id, lea.id);
  await makeFriends(valen.id, marco.id);

  await prisma.place.upsert({
    where: { hostId: ana.id },
    update: {},
    create: {
      hostId: ana.id,
      nickname: "El Nido",
      address: "Gorriti 4380, Palermo",
      arrivalNotes: "Ring 3B. Dog is friendly. Wifi pass on the fridge.",
      amenityKeys: ["wifi_rapido", "monitor", "cafe", "patio", "pet_friendly"],
      defaultCapacity: 3,
    },
  });

  // Recurring: Ana opens Tue+Thu to all friends
  const anaRuleDescription =
    "Foco tranquilo a la mañana, almuerzo liviano y charlas de producto después.";
  const rule = await prisma.availabilityRule.findFirst({ where: { hostId: ana.id } });
  if (!rule) {
    await prisma.availabilityRule.create({
      data: {
        hostId: ana.id,
        weekdays: "2,4",
        startTime: "09:00",
        endTime: "17:00",
        capacity: 3,
        description: anaRuleDescription,
      },
    });
  } else if (!rule.description) {
    await prisma.availabilityRule.update({
      where: { id: rule.id },
      data: { description: anaRuleDescription },
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
      description: "Deep work sin calls: auriculares, mate y una pausa corta al sol.",
      circleId: circle.id,
    });
  }

  // Friends-of-friends one-off: Ana opens wide — Valen sees it via Marco.
  const fofDescription = "Puertas abiertas: traé a esa amiga que siempre labura sola.";
  const existingFofDay = await prisma.coworkDay.findFirst({
    where: { hostId: ana.id, audienceKind: AUDIENCE_FRIENDS_OF_FRIENDS, date: { gte: todayBA() } },
  });
  if (!existingFofDay) {
    await createDay({
      hostId: ana.id,
      date: addDays(todayBA(), 2),
      startTime: "10:00",
      endTime: "17:00",
      capacity: 4,
      description: fofDescription,
      circleId: null,
      audienceKind: AUDIENCE_FRIENDS_OF_FRIENDS,
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
      amenityKeys: ["wifi_rapido", "mate", "patio", "bandejas", "consola"],
      defaultCapacity: 2,
    },
  });
  const marcoRuleDescription = "Día social de terraza: buen wifi, mate y espacio para calls cortas.";
  const marcoRule = await prisma.availabilityRule.findFirst({ where: { hostId: marco.id } });
  if (!marcoRule) {
    await prisma.availabilityRule.create({
      data: {
        hostId: marco.id,
        weekdays: "1,3,5",
        startTime: "10:00",
        endTime: "18:00",
        capacity: 2,
        description: marcoRuleDescription,
      },
    });
  } else if (!marcoRule.description) {
    await prisma.availabilityRule.update({
      where: { id: marcoRule.id },
      data: { description: marcoRuleDescription },
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
  return NextResponse.json({ ok: true, users: 4, coworkDays: days });
}
