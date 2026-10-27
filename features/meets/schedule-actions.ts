"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/features/shared/action-state";
import { getSafeActionError, requireRoles } from "@/lib/auth/authorization";
import { meetManagerRoles } from "@/lib/auth/roles";

function iso(value: string) {
  return new Date(value).toISOString();
}

export async function createVenueAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireRoles(meetManagerRoles);
    const parsed = z
      .object({
        meetId: z.uuid(),
        code: z
          .string()
          .trim()
          .toUpperCase()
          .min(2)
          .max(20)
          .regex(/^[A-Z0-9_-]+$/),
        name: z.string().trim().min(2).max(120),
        locationNote: z.string().trim().max(500),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return {
        status: "error",
        message: "Review the venue name, code and location note.",
      };
    const { error } = await supabase.from("venues").insert({
      sports_meet_id: parsed.data.meetId,
      code: parsed.data.code,
      name: parsed.data.name,
      location_note: parsed.data.locationNote || null,
      created_by: userId,
    });
    if (error)
      return {
        status: "error",
        message:
          error.code === "23505"
            ? "That venue name or code already exists for this meet."
            : "The venue could not be created.",
      };
    revalidatePath(`/admin/meets/${parsed.data.meetId}`);
    return { status: "success", message: "Venue added." };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function recordScheduleAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(meetManagerRoles);
    const parsed = z
      .object({
        meetId: z.uuid(),
        eventId: z.uuid(),
        venueId: z.uuid(),
        startsAt: z.iso.datetime({ local: true }),
        endsAt: z.iso.datetime({ local: true }),
        reason: z.string().trim().min(5).max(1000),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success || parsed.data.endsAt <= parsed.data.startsAt)
      return {
        status: "error",
        message: "Provide a valid venue, schedule and change reason.",
      };
    const { error } = await supabase.rpc("record_event_schedule", {
      p_event_id: parsed.data.eventId,
      p_venue_id: parsed.data.venueId,
      p_starts_at: iso(parsed.data.startsAt),
      p_ends_at: iso(parsed.data.endsAt),
      p_reason: parsed.data.reason,
    });
    if (error)
      return {
        status: "error",
        message: error.message.includes("conflict")
          ? "The venue is already in use during that time."
          : "The schedule change was rejected.",
      };
    revalidatePath(`/admin/meets/${parsed.data.meetId}`);
    return {
      status: "success",
      message: "Schedule updated and its prior values recorded.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function setProtestDeadlineAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(meetManagerRoles);
    const parsed = z
      .object({
        meetId: z.uuid(),
        eventId: z.uuid(),
        protestDeadline: z.iso.datetime({ local: true }),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return { status: "error", message: "Provide a valid protest deadline." };
    const { data, error } = await supabase
      .from("events")
      .update({ protest_deadline_at: iso(parsed.data.protestDeadline) })
      .eq("id", parsed.data.eventId)
      .select("id")
      .maybeSingle();
    if (error || !data)
      return {
        status: "error",
        message: "The protest deadline could not be configured.",
      };
    revalidatePath(`/admin/meets/${parsed.data.meetId}`);
    return { status: "success", message: "Protest deadline recorded." };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function createHeatAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(meetManagerRoles);
    const parsed = z
      .object({
        meetId: z.uuid(),
        eventId: z.uuid(),
        heatNumber: z.coerce.number().int().positive(),
        name: z.string().trim().min(2).max(120),
        venueId: z.preprocess(
          (value) => (value === "" ? null : value),
          z.uuid().nullable(),
        ),
        startsAt: z.iso.datetime({ local: true }),
        endsAt: z.iso.datetime({ local: true }),
        advancementRule: z.string().trim().max(1000),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success || parsed.data.endsAt <= parsed.data.startsAt)
      return {
        status: "error",
        message: "Review the heat/fixture schedule and progression note.",
      };
    const { error } = await supabase.from("event_heats").insert({
      event_id: parsed.data.eventId,
      heat_number: parsed.data.heatNumber,
      name: parsed.data.name,
      venue_id: parsed.data.venueId,
      starts_at: iso(parsed.data.startsAt),
      ends_at: iso(parsed.data.endsAt),
      advancement_rule: parsed.data.advancementRule || null,
      status: "scheduled",
    });
    if (error)
      return {
        status: "error",
        message:
          error.code === "23505"
            ? "That heat or fixture number already exists."
            : "The heat or fixture could not be created.",
      };
    revalidatePath(`/admin/meets/${parsed.data.meetId}`);
    return {
      status: "success",
      message:
        "Heat or fixture scheduled. Progression remains subject to the recorded official rule.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}
