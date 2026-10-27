import { z } from "zod";

export const meetInputSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(3).max(150),
    year: z.coerce.number().int().min(2026).max(2200),
    startsOn: z.iso.date(),
    endsOn: z.iso.date(),
    registrationOpensAt: z.iso.datetime({ local: true }),
    registrationClosesAt: z.iso.datetime({ local: true }),
  })
  .superRefine((value, context) => {
    if (value.endsOn < value.startsOn)
      context.addIssue({
        code: "custom",
        path: ["endsOn"],
        message: "End date must follow the start date.",
      });
    if (Number(value.startsOn.slice(0, 4)) !== value.year)
      context.addIssue({
        code: "custom",
        path: ["year"],
        message: "Year must match the start date.",
      });
    if (value.registrationClosesAt <= value.registrationOpensAt)
      context.addIssue({
        code: "custom",
        path: ["registrationClosesAt"],
        message: "Registration must close after it opens.",
      });
    if (value.registrationClosesAt.slice(0, 10) >= value.startsOn)
      context.addIssue({
        code: "custom",
        path: ["registrationClosesAt"],
        message: "Registration must close before the meet begins.",
      });
  });

export const meetStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum([
    "registration_open",
    "registration_closed",
    "in_progress",
    "completed",
    "cancelled",
    "archived",
  ]),
});

export const categorySchema = z.object({
  meetId: z.uuid(),
  name: z.string().trim().min(2).max(100),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/),
  description: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => value || null),
});

export const eventSchema = z
  .object({
    meetId: z.uuid(),
    categoryId: z.uuid(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(2)
      .max(20)
      .regex(/^[A-Z0-9_-]+$/),
    name: z.string().trim().min(2).max(150),
    description: z
      .string()
      .trim()
      .max(2000)
      .transform((value) => value || null),
    eventType: z.enum(["individual", "team"]),
    formatCode: z.enum([
      "race",
      "jump",
      "throw",
      "relay",
      "team_match",
      "other",
    ]),
    maximumParticipants: z.coerce.number().int().positive().max(1000),
    minimumTeamSize: z.coerce.number().int().positive().optional(),
    maximumTeamSize: z.coerce.number().int().positive().optional(),
    startsAt: z.iso.datetime({ local: true }),
    endsAt: z.iso.datetime({ local: true }),
    rules: z.string().trim().max(5000),
    requirements: z.string().trim().max(5000),
  })
  .superRefine((value, context) => {
    if (value.endsAt <= value.startsAt)
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End time must follow start time.",
      });
    if (
      value.eventType === "team" &&
      (!value.minimumTeamSize ||
        !value.maximumTeamSize ||
        value.maximumTeamSize < value.minimumTeamSize)
    )
      context.addIssue({
        code: "custom",
        path: ["minimumTeamSize"],
        message: "Enter a valid team-size range.",
      });
  });
