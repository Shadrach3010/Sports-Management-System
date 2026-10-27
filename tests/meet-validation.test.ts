import assert from "node:assert/strict";
import test from "node:test";

import { eventSchema, meetInputSchema } from "../features/meets/schemas.ts";

const validMeet = {
  name: "Annual Sports Meet",
  year: 2026,
  startsOn: "2026-11-10",
  endsOn: "2026-11-14",
  registrationOpensAt: "2026-09-01T08:00",
  registrationClosesAt: "2026-10-31T17:00",
};

test("meet validation accepts a registration window before the meet", () => {
  assert.equal(meetInputSchema.safeParse(validMeet).success, true);
});

test("meet validation rejects reversed dates and a mismatched year", () => {
  const result = meetInputSchema.safeParse({
    ...validMeet,
    year: 2027,
    endsOn: "2026-11-01",
  });
  assert.equal(result.success, false);
  if (!result.success) {
    const paths = result.error.issues.map((issue) => issue.path[0]);
    assert.ok(paths.includes("year"));
    assert.ok(paths.includes("endsOn"));
  }
});

test("meet validation rejects registration closing on the meet start date", () => {
  assert.equal(
    meetInputSchema.safeParse({
      ...validMeet,
      registrationClosesAt: "2026-11-10T08:00",
    }).success,
    false,
  );
});

const validEvent = {
  meetId: "10000000-0000-4000-8000-000000000001",
  categoryId: "10000000-0000-4000-8000-000000000002",
  code: "REL-4X100",
  name: "4 x 100 Relay",
  description: "",
  eventType: "team" as const,
  formatCode: "relay" as const,
  maximumParticipants: 8,
  minimumTeamSize: 4,
  maximumTeamSize: 4,
  startsAt: "2026-11-11T10:00",
  endsAt: "2026-11-11T11:00",
  rules: "",
  requirements: "",
};

test("event validation supports team events with bounded team size", () => {
  assert.equal(eventSchema.safeParse(validEvent).success, true);
});

test("event validation rejects an invalid team-size range", () => {
  assert.equal(
    eventSchema.safeParse({
      ...validEvent,
      minimumTeamSize: 6,
      maximumTeamSize: 4,
    }).success,
    false,
  );
});

test("event validation rejects an end time before its start", () => {
  assert.equal(
    eventSchema.safeParse({
      ...validEvent,
      endsAt: "2026-11-11T09:00",
    }).success,
    false,
  );
});
