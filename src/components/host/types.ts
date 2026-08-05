// The host screen is one client island — the server page hands it plain data.

import type { CalendarLinks } from "@/lib/calendar";

/** What every host-side server action resolves to, for useActionState. */
export type HostFormState = {
  status: "idle" | "success" | "error";
  message: string;
  /**
   * Set only by the actions that open a single dated juntada, so the host can put
   * it in their own calendar without going to the day page. Absent for a
   * recurring rule: an open-ended series would keep painting a calendar long
   * after the rule was switched off.
   */
  calendar?: CalendarLinks;
};

export type HostPerson = {
  id: string;
  name: string | null;
  image: string | null;
  /** "se sumó hoy" / "se sumó el jue" — computed server-side, in Buenos Aires time. */
  joinedLabel: string;
};

export type HostPlaceData = {
  nickname: string;
  address: string;
  googlePlaceId: string | null;
  latitude: number | null;
  longitude: number | null;
  addressLine1: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressRegion: string | null;
  addressCountry: string | null;
  addressPostalCode: string | null;
  arrivalNotes: string;
  amenityKeys: string[];
  defaultCapacity: number;
  photos: { id: string; url: string }[];
};

export type HostDayData = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  description: string;
  circleName: string | null;
  audienceKind: string;
  attendees: HostPerson[];
};

export type HostRuleData = {
  id: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  capacity: number;
  description: string;
  active: boolean;
  circleName: string | null;
  audienceKind: string;
  openDayCount: number;
};

export type HostCircle = {
  id: string;
  name: string;
};
