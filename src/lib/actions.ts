"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOnboardedUser, requireUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { areFriends, friendsOf, makeFriends } from "@/lib/friends";
import { createDay, materializeRules } from "@/lib/days";
import {
  normalizeBio,
  normalizeImageUrl,
  normalizeName,
  normalizeUsername,
  validateUsername,
} from "@/lib/profile";
import { formatDay, todayBA } from "@/lib/tz";
import { appUrl } from "@/lib/url";

const first = (name: string | null) => name?.split(" ")[0] ?? "Alguien";

function safeRedirectPath(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim();
  return value.startsWith("/") && !value.startsWith("//") ? value : "/juntadas";
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/juntadas");
  revalidatePath("/host");
  revalidatePath("/friends");
  revalidatePath("/profile");
}

type ProfileFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

type PlaceFormState = ProfileFormState;
type HostDayFormState = ProfileFormState;

const MAX_PLACE_PHOTOS = 9;
const MAX_DAY_DESCRIPTION_LENGTH = 280;
const MAX_PLACE_TEXT = 240;

// --- Profile ---

async function validateProfileFields(formData: FormData, userId: string) {
  const name = normalizeName(formData.get("name"));
  const username = normalizeUsername(formData.get("username"));
  const bio = normalizeBio(formData.get("bio"));
  const imageResult = normalizeImageUrl(formData.get("image"));

  if (!name) return { ok: false as const, message: "Poné un nombre." };
  if (name.length > 80) {
    return { ok: false as const, message: "El nombre tiene que tener menos de 80 caracteres." };
  }

  const usernameMessage = validateUsername(username);
  if (usernameMessage) return { ok: false as const, message: usernameMessage };

  if (!bio) return { ok: false as const, message: "Sumá una bio corta." };
  if (bio.length > 160) {
    return { ok: false as const, message: "La bio tiene que tener menos de 160 caracteres." };
  }

  if (!imageResult.ok) return { ok: false as const, message: imageResult.message };

  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (existing && existing.id !== userId) {
    return { ok: false as const, message: "Ese username ya está usado." };
  }

  return {
    ok: true as const,
    data: { name, username, bio, image: imageResult.image },
  };
}

export async function completeOnboarding(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireUser();
  const result = await validateProfileFields(formData, user.id);

  if (!result.ok) return { status: "error", message: result.message };

  await prisma.user.update({
    where: { id: user.id },
    data: { ...result.data, onboardedAt: new Date() },
  });

  revalidateAll();
  redirect(safeRedirectPath(formData.get("callbackUrl")));
}

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireOnboardedUser();
  const result = await validateProfileFields(formData, user.id);

  if (!result.ok) return { status: "error", message: result.message };

  await prisma.user.update({
    where: { id: user.id },
    data: result.data,
  });

  revalidateAll();
  revalidatePath("/profile");

  return { status: "success", message: "Perfil guardado." };
}

// --- Place ---

export async function savePlace(
  _prevState: PlaceFormState,
  formData: FormData
): Promise<PlaceFormState> {
  const user = await requireOnboardedUser();
  const existingPlace = await prisma.place.findUnique({
    where: { hostId: user.id },
    select: { id: true },
  });
  const addressResult = normalizePlaceAddress(formData);
  if (!addressResult.ok) return { status: "error", message: addressResult.message };

  const data = {
    nickname: String(formData.get("nickname") ?? "").trim() || "My place",
    ...addressResult.data,
    arrivalNotes: String(formData.get("arrivalNotes") ?? "").trim(),
    amenities: String(formData.get("amenities") ?? "").trim(),
    defaultCapacity: Math.max(1, Number(formData.get("defaultCapacity") ?? 4) || 4),
  };
  const photoResult = normalizePlacePhotoUrls(formData.getAll("photoUrls"));
  if (!photoResult.ok) return { status: "error", message: photoResult.message };
  const photos = photoResult.urls.map((url, sortOrder) => ({ url, sortOrder }));

  await prisma.place.upsert({
    where: { hostId: user.id },
    update: { ...data, photos: { deleteMany: {}, create: photos } },
    create: { hostId: user.id, ...data, photos: { create: photos } },
  });
  revalidateAll();

  return {
    status: "success",
    message: existingPlace ? "Lugar guardado." : "Lugar creado.",
  };
}

function normalizePlacePhotoUrls(entries: FormDataEntryValue[]) {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const entry of entries) {
    const result = normalizeImageUrl(entry);
    if (!result.ok) return { ok: false as const, message: result.message };
    if (!result.image || seen.has(result.image)) continue;
    if (urls.length >= MAX_PLACE_PHOTOS) {
      return { ok: false as const, message: `Subí hasta ${MAX_PLACE_PHOTOS} fotos.` };
    }
    seen.add(result.image);
    urls.push(result.image);
  }

  return { ok: true as const, urls };
}

function optionalPlaceText(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  return value.slice(0, MAX_PLACE_TEXT);
}

function parseCoordinate(raw: FormDataEntryValue | null, min: number, max: number) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max) return undefined;
  return coordinate;
}

function normalizePlaceAddress(formData: FormData) {
  const address = String(formData.get("address") ?? "").trim();
  if (!address) return { ok: false as const, message: "Elegí una dirección." };
  if (address.length > MAX_PLACE_TEXT) {
    return { ok: false as const, message: "La dirección tiene que tener menos de 240 caracteres." };
  }

  const googlePlaceId = optionalPlaceText(formData.get("googlePlaceId"));
  if (!googlePlaceId) {
    return {
      ok: true as const,
      data: {
        address,
        googlePlaceId: null,
        latitude: null,
        longitude: null,
        addressLine1: null,
        addressNeighborhood: null,
        addressCity: null,
        addressRegion: null,
        addressCountry: null,
        addressPostalCode: null,
      },
    };
  }

  const latitude = parseCoordinate(formData.get("latitude"), -90, 90);
  const longitude = parseCoordinate(formData.get("longitude"), -180, 180);
  if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
    return {
      ok: false as const,
      message: "No pude leer la ubicación de Google Maps. Volvé a elegir la dirección.",
    };
  }

  return {
    ok: true as const,
    data: {
      address,
      googlePlaceId,
      latitude,
      longitude,
      addressLine1: optionalPlaceText(formData.get("addressLine1")),
      addressNeighborhood: optionalPlaceText(formData.get("addressNeighborhood")),
      addressCity: optionalPlaceText(formData.get("addressCity")),
      addressRegion: optionalPlaceText(formData.get("addressRegion")),
      addressCountry: optionalPlaceText(formData.get("addressCountry")),
      addressPostalCode: optionalPlaceText(formData.get("addressPostalCode")),
    },
  };
}

// --- Days ---

function parseTimes(formData: FormData) {
  const startTime = String(formData.get("startTime") ?? "09:00");
  const endTime = String(formData.get("endTime") ?? "17:00");
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || endTime <= startTime)
    throw new Error("Invalid time range");
  return { startTime, endTime };
}

function normalizeDayDescription(raw: FormDataEntryValue | null) {
  const description = String(raw ?? "").replace(/\r\n?/g, "\n").trim();
  if (description.length > MAX_DAY_DESCRIPTION_LENGTH) {
    return {
      ok: false as const,
      message: `La descripción tiene que tener menos de ${MAX_DAY_DESCRIPTION_LENGTH} caracteres.`,
    };
  }
  return { ok: true as const, description };
}

async function assertOwnCircleOrNull(userId: string, raw: FormDataEntryValue | null) {
  const circleId = String(raw ?? "") || null;
  if (circleId) {
    const circle = await prisma.circle.findFirst({ where: { id: circleId, ownerId: userId } });
    if (!circle) throw new Error("Circle not found");
  }
  return circleId;
}

export async function createOneOffDay(
  _prevState: HostDayFormState,
  formData: FormData
): Promise<HostDayFormState> {
  const user = await requireOnboardedUser();
  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayBA()) {
    return { status: "error", message: "Elegí una fecha válida." };
  }

  let times;
  try {
    times = parseTimes(formData);
  } catch {
    return { status: "error", message: "Revisá el horario: la hora de cierre va después." };
  }
  const { startTime, endTime } = times;
  const capacity = Math.max(1, Number(formData.get("capacity") ?? 4) || 4);
  const descriptionResult = normalizeDayDescription(formData.get("description"));
  if (!descriptionResult.ok) return { status: "error", message: descriptionResult.message };
  let circleId;
  try {
    circleId = await assertOwnCircleOrNull(user.id, formData.get("circleId"));
  } catch {
    return { status: "error", message: "Ese círculo no está disponible." };
  }

  const day = await createDay({
    hostId: user.id,
    date,
    startTime,
    endTime,
    capacity,
    description: descriptionResult.description,
    circleId,
  });

  await sendEmail(
    day.audience.map((a) => a.user.email),
    `${first(user.name)} abrió ${day.place.nickname} — ${formatDay(date)}`,
    `${user.name} abre una juntada para laburar en ${day.place.nickname} el ${formatDay(date)}, ${startTime}–${endTime}. ${capacity} lugares.${day.description ? `\n\nMood: ${day.description}` : ""}\n\nSumate: ${appUrl()}/day/${day.id}`
  );
  revalidateAll();

  return {
    status: "success",
    message: `Listo, nueva juntada abierta para ${formatDay(date)}. Ya aparece en tus próximas juntadas.`,
  };
}

export async function cancelDay(formData: FormData) {
  const user = await requireOnboardedUser();
  const dayId = String(formData.get("dayId"));
  const day = await prisma.coworkDay.findFirst({
    where: { id: dayId, hostId: user.id, status: "open" },
    include: { attendances: { include: { user: true } }, place: true },
  });
  if (!day) throw new Error("Day not found");
  await prisma.coworkDay.update({ where: { id: day.id }, data: { status: "cancelled" } });
  await sendEmail(
    day.attendances.map((a) => a.user.email),
    `Cancelada: ${day.place.nickname} el ${formatDay(day.date)}`,
    `${user.name} canceló la juntada en ${day.place.nickname} el ${formatDay(day.date)}. ¡Perdón!\n\n${appUrl()}/juntadas`
  );
  revalidateAll();
}

export async function joinDay(formData: FormData) {
  const user = await requireOnboardedUser();
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
    `${first(user.name)} se suma ${formatDay(day.date)}`,
    `${user.name} agarró un lugar en ${day.place.nickname} el ${formatDay(day.date)}, ${day.startTime}–${day.endTime}.\n\n${appUrl()}/day/${day.id}`
  );
  revalidateAll();
}

export async function leaveDay(formData: FormData) {
  const user = await requireOnboardedUser();
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
      `${first(user.name)} no va a poder ${formatDay(day.date)}`,
      `${user.name} soltó su lugar en ${day.place.nickname} el ${formatDay(day.date)}.\n\n${appUrl()}/day/${day.id}`
    );
  }
  revalidateAll();
}

export async function removeAttendee(formData: FormData) {
  const user = await requireOnboardedUser();
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
      `Cambio de planes para ${formatDay(day.date)}`,
      `${user.name} tuvo que liberar tu lugar en ${day.place.nickname} el ${formatDay(day.date)}. Perdón — mirá las otras juntadas: ${appUrl()}/juntadas`
    );
  }
  revalidateAll();
}

// --- Rules ---

export async function createRule(
  _prevState: HostDayFormState,
  formData: FormData
): Promise<HostDayFormState> {
  const user = await requireOnboardedUser();
  const weekdays = formData
    .getAll("weekdays")
    .map(Number)
    .filter((n) => n >= 0 && n <= 6);
  if (weekdays.length === 0) return { status: "error", message: "Elegí al menos un día." };

  let times;
  try {
    times = parseTimes(formData);
  } catch {
    return { status: "error", message: "Revisá el horario: la hora de cierre va después." };
  }
  const { startTime, endTime } = times;
  const capacity = Math.max(1, Number(formData.get("capacity") ?? 4) || 4);
  const descriptionResult = normalizeDayDescription(formData.get("description"));
  if (!descriptionResult.ok) return { status: "error", message: descriptionResult.message };
  let circleId;
  try {
    circleId = await assertOwnCircleOrNull(user.id, formData.get("circleId"));
  } catch {
    return { status: "error", message: "Ese círculo no está disponible." };
  }
  const place = await prisma.place.findUnique({ where: { hostId: user.id } });
  if (!place) return { status: "error", message: "Primero creá tu lugar." };

  const rule = await prisma.availabilityRule.create({
    data: {
      hostId: user.id,
      weekdays: weekdays.join(","),
      startTime,
      endTime,
      capacity,
      description: descriptionResult.description,
      circleId,
    },
  });
  await materializeRules();

  const audience = circleId
    ? (
        await prisma.circleMember.findMany({ where: { circleId }, include: { user: true } })
      ).map((m) => m.user)
    : await friendsOf(user.id);
  const dayNames = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const days = rule.weekdays.split(",").map((d) => dayNames[Number(d)]).join(", ");
  await sendEmail(
    audience.map((u) => u.email),
    `${first(user.name)} abre su lugar los ${days}`,
    `${user.name} abrió ${place.nickname} para laburar todos los ${days}, ${startTime}–${endTime} (${capacity} lugares).${rule.description ? `\n\nMood: ${rule.description}` : ""}\n\nMirá las próximas juntadas: ${appUrl()}/juntadas`
  );
  revalidateAll();

  return {
    status: "success",
    message: `Listo, nueva juntada recurrente creada. Ya abrimos las próximas fechas.`,
  };
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
      `Cancelada: ${day.place.nickname} el ${formatDay(day.date)}`,
      `${hostName} canceló la juntada en ${day.place.nickname} el ${formatDay(day.date)}.\n\n${appUrl()}/juntadas`
    );
  }
}

export async function toggleRule(formData: FormData) {
  const user = await requireOnboardedUser();
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
  const user = await requireOnboardedUser();
  const ruleId = String(formData.get("ruleId"));
  const rule = await prisma.availabilityRule.findFirst({ where: { id: ruleId, hostId: user.id } });
  if (!rule) throw new Error("Rule not found");
  await cancelFutureInstances(rule.id, user.name);
  await prisma.availabilityRule.delete({ where: { id: rule.id } });
  revalidateAll();
}

// --- Circles ---

export async function createCircle(formData: FormData) {
  const user = await requireOnboardedUser();
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
  const user = await requireOnboardedUser();
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
  const user = await requireOnboardedUser();
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
  const user = await requireOnboardedUser();
  const token = String(formData.get("token"));
  const inviter = await prisma.user.findUnique({ where: { inviteToken: token } });
  if (!inviter || inviter.id === user.id) throw new Error("Invalid invite");
  await makeFriends(user.id, inviter.id);
  revalidateAll();
  redirect("/juntadas");
}
