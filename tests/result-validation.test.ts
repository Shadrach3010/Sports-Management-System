import assert from "node:assert/strict";
import test from "node:test";

import { resultInputSchema } from "../features/results/schemas.ts";

const valid = {
  eventId: "10000000-0000-4000-8000-000000000001",
  entrant: "registration:20000000-0000-4000-8000-000000000001",
  outcome: "ranked",
  placement: "1",
  timeMilliseconds: "10500",
  distanceMillimetres: "",
  heightMillimetres: "",
  performanceScore: "",
  tieGroup: "",
  anomalyNote: "",
  intent: "submit",
};

test("accepts a ranked timed performance", () => {
  assert.equal(resultInputSchema.safeParse(valid).success, true);
});

test("requires a placement for ranked results", () => {
  assert.equal(
    resultInputSchema.safeParse({ ...valid, placement: "" }).success,
    false,
  );
});

test("rejects placement on a disqualification", () => {
  assert.equal(
    resultInputSchema.safeParse({ ...valid, outcome: "disqualified" }).success,
    false,
  );
});

test("accepts a disqualification without a placement", () => {
  assert.equal(
    resultInputSchema.safeParse({
      ...valid,
      outcome: "disqualified",
      placement: "",
      timeMilliseconds: "",
    }).success,
    true,
  );
});

test("rejects impossible non-positive performance values", () => {
  assert.equal(
    resultInputSchema.safeParse({ ...valid, timeMilliseconds: "0" }).success,
    false,
  );
});
