import assert from "node:assert/strict";
import { test } from "node:test";
import {
  relatedMeet,
  registrationAvailability,
} from "../features/registrations/availability.ts";

const meet = {
  status: "registration_open",
  registration_opens_at: "2026-11-01T08:00:00Z",
  registration_closes_at: "2026-11-18T18:00:00Z",
};
const now = Date.parse("2026-11-03T12:00:00Z");

test("many-to-one meet response opens an eligible event", () => {
  assert.equal(
    registrationAvailability("open", "open", relatedMeet(meet), now),
    "open",
  );
  assert.equal(
    registrationAvailability("open", "open", relatedMeet([meet]), now),
    "open",
  );
});

test("event, meet, roster and window conditions remain distinct", () => {
  assert.equal(
    registrationAvailability("closed", "open", meet, now),
    "event_closed",
  );
  assert.equal(
    registrationAvailability("open", "open", { ...meet, status: "draft" }, now),
    "meet_closed",
  );
  assert.equal(
    registrationAvailability("open", "locked", meet, now),
    "roster_locked",
  );
  assert.equal(
    registrationAvailability(
      "open",
      "open",
      meet,
      Date.parse("2026-11-19T00:00:00Z"),
    ),
    "outside_window",
  );
});
