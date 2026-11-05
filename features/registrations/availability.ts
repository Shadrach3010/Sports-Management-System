export type MeetRegistrationState = {
  status: string;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
};

export function relatedMeet(value: unknown): MeetRegistrationState | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || typeof candidate !== "object") return null;
  const record = candidate as Partial<MeetRegistrationState>;
  return typeof record.status === "string"
    ? (record as MeetRegistrationState)
    : null;
}

export function registrationAvailability(
  eventStatus: string,
  rosterStatus: string,
  meet: MeetRegistrationState | null,
  now: number,
) {
  if (rosterStatus === "locked") return "roster_locked" as const;
  if (eventStatus !== "open") return "event_closed" as const;
  if (meet?.status !== "registration_open") return "meet_closed" as const;
  if (
    !meet.registration_opens_at ||
    !meet.registration_closes_at ||
    now < new Date(meet.registration_opens_at).getTime() ||
    now > new Date(meet.registration_closes_at).getTime()
  )
    return "outside_window" as const;
  return "open" as const;
}
