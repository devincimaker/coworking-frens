import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hostData, circlesOf } from "@/lib/queries";
import { materializeRules } from "@/lib/days";
import { joinedPhrase, todayBA } from "@/lib/tz";
import { appUrl } from "@/lib/url";
import { HostScreen } from "@/components/host/host-screen";

export default async function HostPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const userId = session.user.id;

  await materializeRules();
  const [{ place, rules, days, friendCount, inviteToken }, circles] = await Promise.all([
    hostData(userId),
    circlesOf(userId),
  ]);

  return (
    <HostScreen
      hostId={userId}
      today={todayBA()}
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
      friendCount={friendCount}
      inviteUrl={`${appUrl()}/invite/${inviteToken}`}
      place={
        place && {
          nickname: place.nickname,
          address: place.address,
          googlePlaceId: place.googlePlaceId,
          latitude: place.latitude,
          longitude: place.longitude,
          addressLine1: place.addressLine1,
          addressNeighborhood: place.addressNeighborhood,
          addressCity: place.addressCity,
          addressRegion: place.addressRegion,
          addressCountry: place.addressCountry,
          addressPostalCode: place.addressPostalCode,
          arrivalNotes: place.arrivalNotes,
          amenityKeys: place.amenityKeys,
          defaultCapacity: place.defaultCapacity,
          photos: place.photos.map((photo) => ({ id: photo.id, url: photo.url })),
        }
      }
      days={days.map((day) => ({
        id: day.id,
        date: day.date,
        startTime: day.startTime,
        endTime: day.endTime,
        capacity: day.capacity,
        description: day.description,
        circleName: day.circle?.name ?? null,
        attendees: day.attendances.map((attendance) => ({
          id: attendance.user.id,
          name: attendance.user.name,
          image: attendance.user.image,
          joinedLabel: joinedPhrase(attendance.joinedAt),
        })),
      }))}
      rules={rules.map((rule) => ({
        id: rule.id,
        weekdays: rule.weekdays.split(",").map(Number),
        startTime: rule.startTime,
        endTime: rule.endTime,
        capacity: rule.capacity,
        description: rule.description,
        active: rule.active,
        circleName: rule.circle?.name ?? null,
        openDayCount: rule._count.days,
      }))}
      circles={circles.map((circle) => ({ id: circle.id, name: circle.name }))}
    />
  );
}
