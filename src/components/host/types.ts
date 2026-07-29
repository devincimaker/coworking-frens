// The host screen is one client island — the server page hands it plain data.

/** What every host-side server action resolves to, for useActionState. */
export type HostFormState = {
  status: "idle" | "success" | "error";
  message: string;
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
  openDayCount: number;
};

export type HostCircle = {
  id: string;
  name: string;
};
