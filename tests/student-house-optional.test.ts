import assert from "node:assert/strict";
import test from "node:test";

import { studentInputSchema } from "../features/students/schemas.ts";

const student = {
  studentNumber: "905005991",
  firstName: "Aaliyah",
  lastName: "Mc'Ewen",
  otherNames: "Blessing Christine",
  academicStatus: "enrolled",
};

test("staff can save a student without a house for later assignment", () => {
  const parsed = studentInputSchema.safeParse({ ...student, houseId: "" });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.houseId, null);
});

test("an invalid house identifier is still rejected", () => {
  assert.equal(
    studentInputSchema.safeParse({ ...student, houseId: "not-a-uuid" }).success,
    false,
  );
});
