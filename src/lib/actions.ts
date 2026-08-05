"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireOnboardedUser, requireUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  acceptFriendRequestForUser,
  areFriends,
  declineFriendRequestForUser,
  friendIdsOf,
  friendsOf,
  markFriendRequestsShownInFriends,
  markFriendRequestsShownInJuntadas,
  makeFriends,
  postponeFriendRequestForUser,
  removeFriendForUser,
  requestFriendGlobally,
  requestFriendFromSharedDay,
} from "@/lib/friends";
import { parseAmenityKeys } from "@/lib/amenities";
import { AUDIENCE_FRIENDS, AUDIENCE_FRIENDS_OF_FRIENDS } from "@/lib/audience";
import { createDay, materializeRules } from "@/lib/days";
import {
  normalizeBio,
  normalizeImageUrl,
  normalizeName,
  normalizeUsername,
  validateUsername,
} from "@/lib/profile";
import {
  isTermsCheckboxChecked,
  TERMS_REQUIRED_MESSAGE,
  TERMS_VERSION,
} from "@/lib/terms";
import {
  buildIcs,
  calendarEventFor,
  calendarLinksFor,
  googleCalendarUrl,
  type CalendarDay,
  type CalendarLinks,
} from "@/lib/calendar";
import { CIRCLE_NAME_MAX, type CreateCircleState } from "@/lib/circles";
import { MAX_DAY_CAPACITY } from "@/lib/place";
import { formatDay, todayBA, weekdayOf, WEEKDAY_PLURAL } from "@/lib/tz";
import { appUrl } from "@/lib/url";

const first = (name: string | null) => name?.split(" ")[0] ?? "Alguien";

function safeRedirectPath(raw: FormDataEntryValue | null) {
  const value = String(raw ?? "").trim();
  return value.startsWith("/") && !value.startsWith("//") ? value : "/juntadas";
}

function revalidateAll() {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/juntadas");
  revalidatePath("/host");
  revalidatePath("/friends");
  revalidatePath("/gente");
  revalidatePath("/profile");
}

function revalidateFriendRequestSurfaces(dayId?: string, profileUserIds: string[] = []) {
  revalidateAll();
  revalidatePath("/day/[id]", "page");
  if (dayId) revalidatePath(`/day/${dayId}`);
  for (const userId of profileUserIds) {
    if (userId) revalidatePath(`/u/${userId}`);
  }
}

type ProfileFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

type PlaceFormState = ProfileFormState;
type HostDayFormState = ProfileFormState & {
  /**
   * Only the actions that open one dated juntada set this, so the host can put it
   * straight in their calendar. Never set for a recurring rule: an open-ended
   * series would keep painting a calendar after the rule was switched off.
   */
  calendar?: CalendarLinks;
};

const MAX_PLACE_PHOTOS = 9;
const MAX_DAY_DESCRIPTION_LENGTH = 280;
const MAX_PLACE_TEXT = 240;

const parseCapacity = (raw: FormDataEntryValue | null, fallback = 4) =>
  Math.min(MAX_DAY_CAPACITY, Math.max(1, Number(raw ?? fallback) || fallback));

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

  // Consent is part of sign-up, not an afterthought: no profile without acceptance.
  if (!isTermsCheckboxChecked(formData)) {
    return { status: "error", message: TERMS_REQUIRED_MESSAGE };
  }

  const result = await validateProfileFields(formData, user.id);

  if (!result.ok) return { status: "error", message: result.message };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...result.data,
      onboardedAt: new Date(),
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
    },
  });

  revalidateAll();
  redirect(safeRedirectPath(formData.get("callbackUrl")));
}

/**
 * Standalone acceptance, for people who onboarded before the Terms existed and for
 * everyone again whenever TERMS_VERSION changes. Uses requireUser (not
 * requireOnboardedUser) so the gate itself never bounces them back to onboarding.
 */
export async function acceptTerms(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireUser();

  if (!isTermsCheckboxChecked(formData)) {
    return { status: "error", message: TERMS_REQUIRED_MESSAGE };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION },
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
    amenityKeys: parseAmenityKeys(formData.getAll("amenityKeys")),
    defaultCapacity: parseCapacity(formData.get("defaultCapacity")),
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

// The composer's single "Quién puede venir" select: "" is every friend, the
// friends-of-friends kind widens one hop, anything else must be a circle the
// user owns. Circle ids are cuids, so the kind value cannot collide with one.
async function parseAudience(userId: string, raw: FormDataEntryValue | null) {
  const value = String(raw ?? "");
  if (value === AUDIENCE_FRIENDS_OF_FRIENDS) {
    return { audienceKind: AUDIENCE_FRIENDS_OF_FRIENDS, circleId: null };
  }
  const circleId = value || null;
  if (circleId) {
    const circle = await prisma.circle.findFirst({ where: { id: circleId, ownerId: userId } });
    if (!circle) throw new Error("Circle not found");
  }
  return { audienceKind: AUDIENCE_FRIENDS, circleId };
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
  const capacity = parseCapacity(formData.get("capacity"));
  const descriptionResult = normalizeDayDescription(formData.get("description"));
  if (!descriptionResult.ok) return { status: "error", message: descriptionResult.message };
  let audience;
  try {
    audience = await parseAudience(user.id, formData.get("audience"));
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
    circleId: audience.circleId,
    audienceKind: audience.audienceKind,
  });

  // On a friends-of-friends day the audience includes people who never heard
  // of the host; mail from a stranger reads as spam, so the announcement stays
  // with direct friends and the rest discover the day in their feed.
  let announceTo = day.audience;
  if (audience.audienceKind === AUDIENCE_FRIENDS_OF_FRIENDS) {
    const directFriendIds = new Set(await friendIdsOf(user.id));
    announceTo = day.audience.filter((a) => directFriendIds.has(a.userId));
  }
  await sendEmail(
    announceTo.map((a) => a.user.email),
    `${first(user.name)} abrió ${day.place.nickname} — ${formatDay(date)}`,
    `${user.name} abre una juntada para laburar en ${day.place.nickname} el ${formatDay(date)}, ${startTime}–${endTime}. ${capacity} lugares.${day.description ? `\n\nMood: ${day.description}` : ""}\n\nSumate: ${appUrl()}/day/${day.id}`
  );
  revalidateAll();

  return {
    status: "success",
    message: `Listo, nueva juntada abierta para ${formatDay(date)}. Ya aparece en tus próximas juntadas.`,
    calendar: calendarLinksFor(day),
  };
}

/**
 * The one composer on /host. A date is always picked; the "repetir" switch decides
 * whether that date becomes a single day or the weekday of a recurring rule, whose
 * instances then open themselves three weeks ahead.
 */
export async function openDay(
  prevState: HostDayFormState,
  formData: FormData
): Promise<HostDayFormState> {
  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayBA()) {
    return { status: "error", message: "Elegí una fecha válida." };
  }
  if (formData.get("repeat") !== "on") return createOneOffDay(prevState, formData);

  formData.set("weekdays", String(weekdayOf(date)));
  return createRule(prevState, formData);
}

export async function updateDay(
  _prevState: HostDayFormState,
  formData: FormData
): Promise<HostDayFormState> {
  const user = await requireOnboardedUser();
  const today = todayBA();
  const dayId = String(formData.get("dayId") ?? "");
  const day = await prisma.coworkDay.findFirst({
    where: { id: dayId, hostId: user.id, status: "open", date: { gte: today } },
    include: { attendances: { include: { user: true } }, place: true },
  });
  if (!day) return { status: "error", message: "No encontré esa juntada abierta." };

  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) {
    return { status: "error", message: "Elegí una fecha válida." };
  }

  let times;
  try {
    times = parseTimes(formData);
  } catch {
    return { status: "error", message: "Revisá el horario: la hora de cierre va después." };
  }
  const { startTime, endTime } = times;
  const descriptionResult = normalizeDayDescription(formData.get("description"));
  if (!descriptionResult.ok) return { status: "error", message: descriptionResult.message };

  // Chairs never drop below the people already sitting in them: the host takes
  // someone out first, or cancels the day. Silently un-inviting is not on offer.
  const taken = day.attendances.length;
  const capacityRaw = formData.get("capacity");
  const capacity = capacityRaw === null ? day.capacity : parseCapacity(capacityRaw, day.capacity);
  if (capacity < taken) {
    return {
      status: "error",
      message: `Ya se sumaron ${taken}. Para bajar las sillas, sacá a alguien primero.`,
    };
  }

  const dateChanged = date !== day.date;
  const scheduleChanged = dateChanged || startTime !== day.startTime || endTime !== day.endTime;
  const updatedData = {
    date,
    startTime,
    endTime,
    capacity,
    description: descriptionResult.description,
    reminderSent: scheduleChanged ? false : day.reminderSent,
  };

  try {
    await prisma.$transaction(async (tx) => {
      if (dateChanged && day.ruleId) {
        await tx.coworkDay.update({
          where: { id: day.id },
          data: { ...updatedData, ruleId: null },
        });
        await tx.coworkDay.create({
          data: {
            hostId: day.hostId,
            placeId: day.placeId,
            date: day.date,
            startTime: day.startTime,
            endTime: day.endTime,
            capacity: day.capacity,
            description: day.description,
            status: "cancelled",
            ruleId: day.ruleId,
            circleId: day.circleId,
            reminderSent: true,
          },
        });
        return;
      }

      await tx.coworkDay.update({
        where: { id: day.id },
        data: updatedData,
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        status: "error",
        message: "Ya existe una juntada recurrente para esa fecha.",
      };
    }
    throw err;
  }

  if (scheduleChanged) {
    const oldWhen = `${formatDay(day.date)}, ${day.startTime}–${day.endTime}`;
    const newWhen = `${formatDay(date)}, ${startTime}–${endTime}`;

    await sendEmail(
      day.attendances.map((a) => a.user.email),
      `Cambio: ${day.place.nickname} ahora es ${formatDay(date)}`,
      `${user.name} cambió la juntada en ${day.place.nickname}.\n\nAntes: ${oldWhen}\nAhora: ${newWhen}.\n\nTu lugar sigue reservado. Si no podés ir, bajate desde: ${appUrl()}/day/${day.id}`
    );
  }

  revalidateAll();
  revalidatePath(`/day/${day.id}`);

  return {
    status: "success",
    message: scheduleChanged && day.attendances.length > 0
      ? "Juntada guardada. Avisamos a quienes ya vienen."
      : "Juntada guardada.",
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

/** The joiner's own copy: what they signed up for, with the event attached. */
function joinConfirmation(day: CalendarDay & { startTime: string; endTime: string }) {
  const event = calendarEventFor(day);
  const where = day.place.address.trim();
  const notes = day.place.arrivalNotes.trim();

  return {
    subject: `Ya estás anotado: ${day.place.nickname}, ${formatDay(day.date)}`,
    text: [
      `Listo, tenés lugar en ${day.place.nickname} el ${formatDay(day.date)}, ${day.startTime}–${day.endTime}.`,
      where ? `Dónde: ${where}` : "",
      notes ? `Cómo llegar: ${notes}` : "",
      `Agregala a tu calendario: el archivo .ics va adjunto, o abrila en Google Calendar:\n${googleCalendarUrl(event)}`,
      `Quiénes van y el resto de los detalles: ${appUrl()}/day/${day.id}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    attachment: {
      filename: `juntada-${day.date}.ics`,
      content: buildIcs(event, new Date()),
    },
  };
}

export async function joinDay(formData: FormData) {
  const user = await requireOnboardedUser();
  const dayId = String(formData.get("dayId"));
  const { day, joined } = await prisma.$transaction(async (tx) => {
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
    // A double tap, or a replayed form, must not read as a second arrival.
    if (day.attendances.some((a) => a.userId === user.id)) return { day, joined: false };
    if (day.attendances.length >= day.capacity) throw new Error("Day is full");
    await tx.attendance.create({ data: { dayId: day.id, userId: user.id } });
    return { day, joined: true };
  });

  if (joined) {
    await sendEmail(
      [day.host.email],
      `${first(user.name)} se suma ${formatDay(day.date)}`,
      `${user.name} agarró un lugar en ${day.place.nickname} el ${formatDay(day.date)}, ${day.startTime}–${day.endTime}.\n\n${appUrl()}/day/${day.id}`
    );

    // The seat is already committed. sendEmail swallows its own failures, but
    // building the event is new work that can throw on data we did not foresee —
    // and nobody should lose their place because a calendar file would not
    // assemble. Whatever happens here, they are going.
    try {
      const confirmation = joinConfirmation(day);
      await sendEmail([user.email], confirmation.subject, confirmation.text, {
        attachments: [confirmation.attachment],
      });
    } catch (err) {
      console.error("join confirmation failed", err instanceof Error ? err.message : err);
    }
  }

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

// --- Friend requests ---

export async function sendFriendRequestFromDay(formData: FormData) {
  const user = await requireOnboardedUser();
  const dayId = String(formData.get("dayId") ?? "");
  const recipientId = String(formData.get("recipientId") ?? "");
  const profileUserId = String(formData.get("profileUserId") ?? "");

  const result = await requestFriendFromSharedDay({
    requesterId: user.id,
    recipientId,
    coworkDayId: dayId,
  });

  if (result.outcome === "requested") {
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true },
    });
    if (recipient) {
      await sendEmail(
        [recipient.email],
        `${first(user.name)} te mandó pedido de amistad`,
        `${user.name} te mandó un pedido después de coincidir en ${result.day.place.nickname} el ${formatDay(result.day.date)}, ${result.day.startTime}–${result.day.endTime}.\n\nRespondé desde: ${appUrl()}/friends`
      );
    }
  }

  revalidateFriendRequestSurfaces(dayId, [user.id, recipientId, profileUserId]);
}

export async function sendFriendRequestFromGente(formData: FormData) {
  const user = await requireOnboardedUser();
  const recipientId = String(formData.get("recipientId") ?? "");
  const profileUserId = String(formData.get("profileUserId") ?? "");

  const result = await requestFriendGlobally({
    requesterId: user.id,
    recipientId,
  });

  if (result.outcome === "requested") {
    await sendEmail(
      [result.recipient.email],
      `${first(user.name)} te mandó pedido de amistad`,
      `${user.name} te mandó un pedido de amistad en Frens.\n\nRespondé desde: ${appUrl()}/friends`
    );
  }

  revalidateFriendRequestSurfaces(undefined, [user.id, recipientId, profileUserId]);
}

export async function acceptFriendRequest(formData: FormData) {
  const user = await requireOnboardedUser();
  const requestId = String(formData.get("requestId") ?? "");
  const profileUserId = String(formData.get("profileUserId") ?? "");
  const request = await acceptFriendRequestForUser(requestId, user.id);

  await sendEmail(
    [request.requester.email],
    `${first(user.name)} aceptó tu pedido`,
    `${user.name} aceptó tu pedido de amistad. Ya pueden ver las juntadas del otro.\n\n${appUrl()}/friends`
  );

  revalidateFriendRequestSurfaces(undefined, [user.id, request.requester.id, profileUserId]);
}

export async function declineFriendRequest(formData: FormData) {
  const user = await requireOnboardedUser();
  const requestId = String(formData.get("requestId") ?? "");
  const profileUserId = String(formData.get("profileUserId") ?? "");
  await declineFriendRequestForUser(requestId, user.id);
  revalidateFriendRequestSurfaces(undefined, [user.id, profileUserId]);
}

export async function postponeFriendRequestFromJuntadas(formData: FormData) {
  const user = await requireOnboardedUser();
  const requestId = String(formData.get("requestId") ?? "");
  await postponeFriendRequestForUser(requestId, user.id);
  revalidatePath("/", "layout");
  revalidatePath("/juntadas");
}

export async function markJuntadasFriendRequestBatchShown(requestIds: string[]) {
  const user = await requireOnboardedUser();
  await markFriendRequestsShownInJuntadas(requestIds, user.id);
}

export async function markFriendRequestBadgeSeen(requestIds: string[]) {
  const user = await requireOnboardedUser();
  await markFriendRequestsShownInFriends(requestIds, user.id);
  revalidatePath("/", "layout");
}

export async function removeFriend(formData: FormData) {
  const user = await requireOnboardedUser();
  const friendId = String(formData.get("friendId") ?? "");
  await removeFriendForUser(user.id, friendId);
  revalidateFriendRequestSurfaces(undefined, [user.id, friendId]);
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
  const capacity = parseCapacity(formData.get("capacity"));
  const descriptionResult = normalizeDayDescription(formData.get("description"));
  if (!descriptionResult.ok) return { status: "error", message: descriptionResult.message };
  let audience;
  try {
    audience = await parseAudience(user.id, formData.get("audience"));
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
      circleId: audience.circleId,
      audienceKind: audience.audienceKind,
    },
  });
  await materializeRules();

  // Friends-of-friends rules announce to direct friends only, same as one-off
  // days: the wider audience discovers the instances in their feed.
  const recipients = audience.circleId
    ? (
        await prisma.circleMember.findMany({
          where: { circleId: audience.circleId },
          include: { user: true },
        })
      ).map((m) => m.user)
    : await friendsOf(user.id);
  const dayNames = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const days = rule.weekdays.split(",").map((d) => dayNames[Number(d)]).join(", ");
  await sendEmail(
    recipients.map((u) => u.email),
    `${first(user.name)} abre su lugar los ${days}`,
    `${user.name} abrió ${place.nickname} para laburar todos los ${days}, ${startTime}–${endTime} (${capacity} lugares).${rule.description ? `\n\nMood: ${rule.description}` : ""}\n\nMirá las próximas juntadas: ${appUrl()}/juntadas`
  );
  revalidateAll();

  return {
    status: "success",
    message: `Listo, ahora abrís todos los ${weekdays
      .map((d) => WEEKDAY_PLURAL[d])
      .join(" y ")}. Ya abrimos las próximas tres semanas.`,
  };
}

/** Deleting a rule cancels its future instances and notifies attendees. */
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

/**
 * Pausing stops the rule from opening *new* days. It deliberately leaves the days
 * it already opened standing: materializeRules treats any date it has touched as
 * spent — cancelled included, so a day you called off by hand is never resurrected
 * — which means a pause that cancelled could never be undone. A switch that reads
 * "pausar" has to be a switch. Clearing the calendar is per-day, or delete the rule.
 */
export async function toggleRule(formData: FormData) {
  const user = await requireOnboardedUser();
  const ruleId = String(formData.get("ruleId"));
  const rule = await prisma.availabilityRule.findFirst({ where: { id: ruleId, hostId: user.id } });
  if (!rule) throw new Error("Rule not found");
  await prisma.availabilityRule.update({ where: { id: rule.id }, data: { active: !rule.active } });
  if (!rule.active) await materializeRules();
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


/**
 * A name *and* its people, in one transaction. An empty circle is not a circle
 * half-made: it is an audience of nobody that then clutters the host picker and
 * silently opens a day to no one, so the emptiness is rejected here rather than
 * merely discouraged in the form. Returns its error instead of throwing —
 * "you already have one called that" is the user's to fix, not a crash.
 */
export async function createCircle(
  _prev: CreateCircleState,
  formData: FormData
): Promise<CreateCircleState> {
  const user = await requireOnboardedUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Poné un nombre.", created: false };
  if (name.length > CIRCLE_NAME_MAX) {
    return { error: `El nombre no puede pasar de ${CIRCLE_NAME_MAX} caracteres.`, created: false };
  }

  const memberIds = Array.from(
    new Set(formData.getAll("memberIds").map((id) => String(id)).filter(Boolean))
  );
  if (memberIds.length === 0) return { error: "Elegí al menos a una persona.", created: false };

  const friendIds = new Set(await friendIdsOf(user.id));
  if (memberIds.some((id) => !friendIds.has(id))) {
    return { error: "Alguno de los elegidos ya no es amigo tuyo.", created: false };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const circle = await tx.circle.create({ data: { ownerId: user.id, name } });
      await tx.circleMember.createMany({
        data: memberIds.map((userId) => ({ circleId: circle.id, userId })),
      });
    });
  } catch (error) {
    // The ownerId+name unique index, which the pre-check above can still lose a
    // race to. Same message either way.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: `Ya tenés un círculo que se llama “${name}”.`, created: false };
    }
    throw error;
  }

  // Not just /friends: a new circle is a new audience to pick from on /host.
  revalidateAll();
  return { error: null, created: true };
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
    // The other end of the rule createCircle enforces. Taking out the last
    // member is a request to delete the circle, and the form asks that question
    // outright rather than leaving an audience of nobody behind.
    const members = await prisma.circleMember.count({ where: { circleId } });
    if (members <= 1) throw new Error("A circle cannot be emptied");
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
