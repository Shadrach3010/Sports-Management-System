import { z } from "zod";

const colorSchema = z
  .string()
  .trim()
  .transform((value) => (value ? value.toUpperCase() : null))
  .refine(
    (value) => value === null || /^#[0-9A-F]{6}$/.test(value),
    "Use a six-digit hex color such as #173B66.",
  );

export const houseInputSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Enter a house name.").max(100),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Enter a code.")
    .max(12)
    .regex(/^[A-Z0-9_-]+$/, "Use letters, numbers, underscores, or hyphens."),
  officialColor: colorSchema,
});

export const houseStatusSchema = z.object({
  id: z.uuid(),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
});
