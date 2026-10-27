import { z } from "zod";

export const academicStatuses = [
  "enrolled",
  "suspended",
  "graduated",
  "withdrawn",
] as const;
export const eligibilityStatuses = [
  "unverified",
  "eligible",
  "ineligible",
] as const;

export const studentInputSchema = z.object({
  id: z.uuid().optional(),
  studentNumber: z
    .string()
    .trim()
    .min(1, "Enter a student number.")
    .max(64)
    .regex(
      /^[^\u0000-\u001F]+$/,
      "The student number contains control characters.",
    ),
  firstName: z.string().trim().min(1, "Enter a first name.").max(100),
  lastName: z.string().trim().min(1, "Enter a last name.").max(100),
  otherNames: z
    .string()
    .trim()
    .max(150)
    .transform((value) => value || null),
  academicStatus: z.enum(academicStatuses),
  houseId: z.uuid("Select a house."),
});

export const eligibilityInputSchema = z
  .object({
    studentId: z.uuid(),
    status: z.enum(eligibilityStatuses),
    reason: z
      .string()
      .trim()
      .max(500)
      .transform((value) => value || null),
  })
  .refine(
    (value) =>
      value.status !== "ineligible" || (value.reason?.length ?? 0) >= 3,
    {
      message: "Enter a reason when marking a student ineligible.",
      path: ["reason"],
    },
  );
