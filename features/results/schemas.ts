import { z } from "zod";

const optionalPositiveInteger = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().positive().optional(),
);
const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().optional(),
);

export const resultInputSchema = z
  .object({
    resultId: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.uuid().optional(),
    ),
    eventId: z.uuid(),
    entrant: z.string().regex(/^(registration|team):[0-9a-f-]{36}$/i),
    outcome: z.enum([
      "ranked",
      "did_not_start",
      "did_not_finish",
      "disqualified",
      "withdrawn",
      "abandoned",
    ]),
    placement: optionalPositiveInteger,
    timeMilliseconds: optionalPositiveInteger,
    distanceMillimetres: optionalPositiveInteger,
    heightMillimetres: optionalPositiveInteger,
    performanceScore: optionalNumber,
    tieGroup: z.string().trim().max(40),
    anomalyNote: z.string().trim().max(1000),
    intent: z.enum(["draft", "submit"]),
  })
  .superRefine((value, context) => {
    if (value.outcome === "ranked" && !value.placement)
      context.addIssue({
        code: "custom",
        path: ["placement"],
        message: "Ranked results require a placement.",
      });
    if (value.outcome !== "ranked" && value.placement)
      context.addIssue({
        code: "custom",
        path: ["placement"],
        message: "Non-ranked outcomes cannot have a placement.",
      });
  });

export const reviewResultSchema = z.object({
  resultId: z.uuid(),
  decision: z.enum(["verified", "rejected"]),
  reason: z.string().trim().min(5).max(1000),
});
