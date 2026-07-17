"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { areFriends, friendsOf, makeFriends } from "@/lib/friends";
import { createDay, materializeRules } from "@/lib/days";
import { formatDay, todayBA } from "@/lib/tz";
import { appUrl } from "@/lib/url";

const first = (name: string | null) => name?.split(" ")[0] ?? "A friend";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/host");
  revalidatePath("/friends");
}

type ProfileFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

type ImageUrlResult =
  | { ok: true; image: string | null }
  | { ok: false; message: string };

function normalizeName(raw: FormDataEntryValue | null) {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeImageUrl(raw: FormDataEntryValue | null): ImageUrlResult {
  const value = String(raw ?? "").trim();
  if (!value) return { ok: true, image: null };
  if (value.length > 500) {
    return { ok: false, message: "Use an image URL under 500 characters." };
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, message: "Use an http or https image URL." };
    }
    return { ok: true, image: url.toString() };
  } catch {
    return { ok: false, message: "Use a valid image URL." };
  }
}

// --- Profile ---

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireUser();
  const name = normalizeName(formData.get("name"));
  const result = normalizeImageUrl(formData.get("image"));

  if (!name) return { status: "error", message: "Add a display name." };
  if (name.length > 80) return { status: "error", message: "Keep the name under 80 characters." };
  if (!result.ok) return { status: "error", message: result.message };

  await prisma.user.update({
    where: { id: user.id },
    data: { name, image: result.image },
  });

  revalidateAll();
  revalidatePath("/profile");

  return { status: "success", message: "Profile saved." };
}

// --- Place ---

export async function savePlace(formData: FormData) {
  const user = await requireUser();
  const data = {
    nickname: String(formData.get("nickname") ?? "").trim() || "My place",
    address: String(formData.get("address") ?? "").trim(),
    arrivalNotes: String(formData.get("arrivalNotes") ?? "").trim(),
    amenities: String(formData.get("amenities") ?? "").trim(),
    defaultCapacity: Math.max(1, Number(formData.get("defaultCapacity") ?? 4) || 4),
  };
  await prisma.place.upsert({
    where: { hostId: user.id },
    update: data,
    create: { hostId: user.id, ...data },
  });
  revalidatePath("/host");
}

// --- Days ---

function parseTimes(formData: FormData) {
  const startTime = String(formData.get("startTime") ?? "09:00");
  const endTime = String(formData.get("endTime") ?? "17:00");
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || endTime <= startTime)
    throw new Error("Invalid time range");
  return { startTime, endTime };
}

async function assertOwnCircleOrNull(userId: string, raw: FormDataEntryValue | null) {
  const circleId = String(raw ?? "") || null;
  if (circleId) {
    const circle = await prisma.circle.findFirst({ where: { id: circleId, ownerId: userId } });
    if (!circle) throw new Error("Circle not found");
  }
  return circleId;
}

export async function createOneOffDay(formData: FormData) {
  const user = await requireUser();
  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayBA()) throw new Error("Invalid date");
  const { startTime, endTime } = parseTimes(formData);
  const capacity = Math.max(1, Number(formData.get("capacity") ?? 4) || 4);
  const circleId = await assertOwnCircleOrNull(user.id, formData.get("circleId"));

  const day = await createDay({ hostId: user.id, date, startTime, endTime, capacity, circleId });

  await sendEmail(
    day.audience.map((a) => a.user.email),
    `${first(user.name)} opened ${day.place.nickname} — ${formatDay(date)}`,
    `${user.name} is hosting a cowork day at ${day.place.nickname} on ${formatDay(date)}, ${startTime}–${endTime}. ${capacity} spots.\n\nClaim yours: ${appUrl()}/day/${day.id}`
  );
  revalidateAll();
}

export async function cancelDay(formData: FormData) {
  const user = await requireUser();
  const dayId = String(formData.get("dayId"));
  const day = await prisma.coworkDay.findFirst({
    where: { id: dayId, hostId: user.id, status: "open" },
    include: { attendances: { include: { user: true } }, place: true },
  });
  if (!day) throw new Error("Day not found");
  await prisma.coworkDay.update({ where: { id: day.id }, data: { status: "cancelled" } });
  await sendEmail(
    day.attendances.map((a) => a.user.email),
    `Cancelled: ${day.place.nickname} on ${formatDay(day.date)}`,
    `${user.name} cancelled the cowork day at ${day.place.nickname} on ${formatDay(day.date)}. Sorry!\n\n${appUrl()}`
  );
  revalidateAll();
}

export async function joinDay(formData: FormData) {
  const user = await requireUser();
  const dayId = String(formData.get("dayId"));
  const day = await prisma.$transaction(async (tx) => {
    const day = await tx.coworkDay.findFirst({
      where: {
        id: dayId,
        status: "open",
        date: { gte: todayBA() },
        hostId: { not: user.id },
        audience: { some: { userId: user.id } },
      },
      include: { attendances: true, host: true, place: true },
    });
    if (!day) throw new Error("Day not available");
    if (day.attendances.some((a) => a.userId === user.id)) return day;
    if (day.attendances.length >= day.capacity) throw new Error("Day is full");
    await tx.attendance.create({ data: { dayId: day.id, userId: user.id } });
    return day;
  });
  await sendEmail(
    [day.host.email],
    `${first(user.name)} is coming ${formatDay(day.date)}`,
    `${user.name} claimed a spot at ${day.place.nickname} on ${formatDay(day.date)}, ${day.startTime}–${day.endTime}.\n\n${appUrl()}/day/${day.id}`
  );
  revalidateAll();
}

export async function leaveDay(formData: FormData) {
  const user = await requireUser();
  const dayId = String(formData.get("dayId"));
  const attendance = await prisma.attendance.findUnique({
    where: { dayId_userId: { dayId, userId: user.id } },
    include: { day: { include: { host: true, place: true } } },
  });
  if (!attendance) return;
  await prisma.attendance.delete({ where: { id: attendance.id } });
  const { day } = attendance;
  if (day.status === "open" && day.date >= todayBA()) {
    await sendEmail(
      [day.host.email],
      `${first(user.name)} can't make it ${formatDay(day.date)}`,
      `${user.name} gave up their spot at ${day.place.nickname} on ${formatDay(day.date)}.\n\n${appUrl()}/day/${day.id}`
    );
  }
  revalidateAll();
}

export async function removeAttendee(formData: FormData) {
  const user = await requireUser();
  const dayId = String(formData.get("dayId"));
  const userId = String(formData.get("userId"));
  const day = await prisma.coworkDay.findFirst({
    where: { id: dayId, hostId: user.id },
    include: { place: true },
  });
  if (!day) throw new Error("Day not found");
  const removed = await prisma.user.findUnique({ where: { id: userId } });
  await prisma.attendance.deleteMany({ where: { dayId, userId } });
  if (removed) {
    await sendEmail(
      [removed.email],
      `Change of plans for ${formatDay(day.date)}`,
      `${user.name} had to free up your spot at ${day.place.nickname} on ${formatDay(day.date)}. Sorry about that — check the feed for other days: ${appUrl()}`
    );
  }
  revalidateAll();
}

// --- Rules ---

export async function createRule(formData: FormData) {
  const user = await requireUser();
  const weekdays = formData
    .getAll("weekdays")
    .map(Number)
    .filter((n) => n >= 0 && n <= 6);
  if (weekdays.length === 0) throw new Error("Pick at least one weekday");
  const { startTime, endTime } = parseTimes(formData);
  const capacity = Math.max(1, Number(formData.get("capacity") ?? 4) || 4);
  const circleId = await assertOwnCircleOrNull(user.id, formData.get("circleId"));
  const place = await prisma.place.findUnique({ where: { hostId: user.id } });
  if (!place) throw new Error("Set up your place first");

  const rule = await prisma.availabilityRule.create({
    data: { hostId: user.id, weekdays: weekdays.join(","), startTime, endTime, capacity, circleId },
  });
  await materializeRules();

  const audience = circleId
    ? (
        await prisma.circleMember.findMany({ where: { circleId }, include: { user: true } })
      ).map((m) => m.user)
    : await friendsOf(user.id);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = rule.weekdays.split(",").map((d) => dayNames[Number(d)]).join(", ");
  await sendEmail(
    audience.map((u) => u.email),
    `${first(user.name)}'s place is now open on ${days}`,
    `${user.name} opened ${place.nickname} for coworking every ${days}, ${startTime}–${endTime} (${capacity} spots).\n\nSee upcoming days: ${appUrl()}`
  );
  revalidateAll();
}

/** Deactivating (or deleting) a rule cancels its future instances and notifies attendees. */
async function cancelFutureInstances(ruleId: string, hostName: string | null) {
  const days = await prisma.coworkDay.findMany({
    where: { ruleId, status: "open", date: { gte: todayBA() } },
    include: { attendances: { include: { user: true } }, place: true },
  });
  for (const day of days) {
    await prisma.coworkDay.update({ where: { id: day.id }, data: { status: "cancelled" } });
    await sendEmail(
      day.attendances.map((a) => a.user.email),
      `Cancelled: ${day.place.nickname} on ${formatDay(day.date)}`,
      `${hostName} cancelled the cowork day at ${day.place.nickname} on ${formatDay(day.date)}.\n\n${appUrl()}`
    );
  }
}

export async function toggleRule(formData: FormData) {
  const user = await requireUser();
  const ruleId = String(formData.get("ruleId"));
  const rule = await prisma.availabilityRule.findFirst({ where: { id: ruleId, hostId: user.id } });
  if (!rule) throw new Error("Rule not found");
  await prisma.availabilityRule.update({ where: { id: rule.id }, data: { active: !rule.active } });
  if (rule.active) {
    await cancelFutureInstances(rule.id, user.name);
  } else {
    await materializeRules();
  }
  revalidateAll();
}

export async function deleteRule(formData: FormData) {
  const user = await requireUser();
  const ruleId = String(formData.get("ruleId"));
  const rule = await prisma.availabilityRule.findFirst({ where: { id: ruleId, hostId: user.id } });
  if (!rule) throw new Error("Rule not found");
  await cancelFutureInstances(rule.id, user.name);
  await prisma.availabilityRule.delete({ where: { id: rule.id } });
  revalidateAll();
}

// --- Circles ---

export async function createCircle(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name required");
  await prisma.circle.upsert({
    where: { ownerId_name: { ownerId: user.id, name } },
    update: {},
    create: { ownerId: user.id, name },
  });
  revalidatePath("/friends");
}

export async function deleteCircle(formData: FormData) {
  const user = await requireUser();
  const circleId = String(formData.get("circleId"));
  const circle = await prisma.circle.findFirst({ where: { id: circleId, ownerId: user.id } });
  if (!circle) throw new Error("Circle not found");
  // Rules aimed at this circle would silently widen to all-friends; deactivate them instead.
  const rules = await prisma.availabilityRule.findMany({
    where: { circleId: circle.id, active: true },
  });
  for (const rule of rules) {
    await prisma.availabilityRule.update({ where: { id: rule.id }, data: { active: false } });
    await cancelFutureInstances(rule.id, user.name);
  }
  await prisma.circle.delete({ where: { id: circle.id } });
  revalidateAll();
}

export async function toggleCircleMember(formData: FormData) {
  const user = await requireUser();
  const circleId = String(formData.get("circleId"));
  const friendId = String(formData.get("friendId"));
  const circle = await prisma.circle.findFirst({ where: { id: circleId, ownerId: user.id } });
  if (!circle) throw new Error("Circle not found");
  if (!(await areFriends(user.id, friendId))) throw new Error("Not your friend");
  const existing = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId: friendId } },
  });
  if (existing) {
    await prisma.circleMember.delete({ where: { id: existing.id } });
  } else {
    await prisma.circleMember.create({ data: { circleId, userId: friendId } });
  }
  revalidatePath("/friends");
}

// --- Invites ---

export async function acceptInvite(formData: FormData) {
  const user = await requireUser();
  const token = String(formData.get("token"));
  const inviter = await prisma.user.findUnique({ where: { inviteToken: token } });
  if (!inviter || inviter.id === user.id) throw new Error("Invalid invite");
  await makeFriends(user.id, inviter.id);
  revalidateAll();
  redirect("/");
}
