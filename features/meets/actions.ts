"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/features/shared/action-state";
import {
  categorySchema,
  eventSchema,
  meetInputSchema,
  meetStatusSchema,
} from "@/features/meets/schemas";
import { getSafeActionError, requireRoles } from "@/lib/auth/authorization";
import { meetManagerRoles } from "@/lib/auth/roles";

function iso(value: string) {
  return new Date(value).toISOString();
}
function databaseMessage(
  error: { code?: string; message?: string } | null,
  fallback: string,
) {
  if (error?.code === "23505")
    return "A record with that name or code already exists.";
  if (error?.message?.includes("transition"))
    return "That status transition is not permitted.";
  if (error?.message?.includes("complete"))
    return "Complete all event configuration before opening registration.";
  return fallback;
}

export async function createMeetAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(meetManagerRoles);
    const parsed = meetInputSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return {
        status: "error",
        message:
          parsed.error.issues[0]?.message ?? "Review the meet configuration.",
      };
    const { error } = await supabase.from("sports_meets").insert({
      name: parsed.data.name,
      year: parsed.data.year,
      starts_on: parsed.data.startsOn,
      ends_on: parsed.data.endsOn,
      registration_opens_at: iso(parsed.data.registrationOpensAt),
      registration_closes_at: iso(parsed.data.registrationClosesAt),
      status: "draft",
    });
    if (error)
      return {
        status: "error",
        message: databaseMessage(error, "The meet could not be created."),
      };
    revalidatePath("/admin/meets");
    return {
      status: "success",
      message: "The sports meet was created as a draft.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function updateMeetAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(meetManagerRoles);
    const parsed = meetInputSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success || !parsed.data.id)
      return {
        status: "error",
        message: parsed.success
          ? "Meet identifier is required."
          : (parsed.error.issues[0]?.message ??
            "Review the meet configuration."),
      };
    const value = parsed.data;
    const { data, error } = await supabase
      .from("sports_meets")
      .update({
        name: value.name,
        year: value.year,
        starts_on: value.startsOn,
        ends_on: value.endsOn,
        registration_opens_at: iso(value.registrationOpensAt),
        registration_closes_at: iso(value.registrationClosesAt),
      })
      .eq("id", value.id)
      .select("id")
      .maybeSingle();
    if (error || !data)
      return {
        status: "error",
        message: databaseMessage(
          error,
          "The meet configuration could not be updated.",
        ),
      };
    revalidatePath("/admin/meets");
    revalidatePath(`/admin/meets/${value.id}`);
    return { status: "success", message: "Meet configuration updated." };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function transitionMeetAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(meetManagerRoles);
    const parsed = meetStatusSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
    });
    if (!parsed.success)
      return { status: "error", message: "Invalid meet status request." };
    const { data, error } = await supabase
      .from("sports_meets")
      .update({
        status: parsed.data.status,
        published_at:
          parsed.data.status === "registration_open"
            ? new Date().toISOString()
            : undefined,
      })
      .eq("id", parsed.data.id)
      .select("id")
      .maybeSingle();
    if (error || !data)
      return {
        status: "error",
        message: databaseMessage(
          error,
          "The meet status could not be changed.",
        ),
      };
    revalidatePath("/admin/meets");
    revalidatePath(`/admin/meets/${parsed.data.id}`);
    return {
      status: "success",
      message: `Meet status changed to ${parsed.data.status.replaceAll("_", " ")}.`,
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function setMeetHouseAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireRoles(meetManagerRoles);
    const meetId = String(formData.get("meetId"));
    const houseId = String(formData.get("houseId"));
    const active = formData.get("active") === "true";
    if (!/^[0-9a-f-]{36}$/i.test(meetId) || !/^[0-9a-f-]{36}$/i.test(houseId))
      return { status: "error", message: "Invalid meet-house selection." };
    const { error } = await supabase.from("meet_houses").upsert(
      {
        sports_meet_id: meetId,
        house_id: houseId,
        is_active: active,
        added_by: userId,
      },
      { onConflict: "sports_meet_id,house_id" },
    );
    if (error)
      return {
        status: "error",
        message: "The participating house could not be updated.",
      };
    revalidatePath(`/admin/meets/${meetId}`);
    return {
      status: "success",
      message: active
        ? "House added to the meet."
        : "House removed from participation.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function createCategoryAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireRoles(meetManagerRoles);
    const parsed = categorySchema.safeParse({
      meetId: formData.get("meetId"),
      name: formData.get("name"),
      code: formData.get("code"),
      description: formData.get("description") ?? "",
    });
    if (!parsed.success)
      return {
        status: "error",
        message: parsed.error.issues[0]?.message ?? "Review the category.",
      };
    const { error } = await supabase.from("sport_categories").insert({
      sports_meet_id: parsed.data.meetId,
      name: parsed.data.name,
      code: parsed.data.code,
      description: parsed.data.description,
      created_by: userId,
    });
    if (error)
      return {
        status: "error",
        message: databaseMessage(error, "The category could not be created."),
      };
    revalidatePath(`/admin/meets/${parsed.data.meetId}`);
    return { status: "success", message: "Sport category created." };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function createEventAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(meetManagerRoles);
    const parsed = eventSchema.safeParse({
      meetId: formData.get("meetId"),
      categoryId: formData.get("categoryId"),
      code: formData.get("code"),
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      eventType: formData.get("eventType"),
      formatCode: formData.get("formatCode"),
      maximumParticipants: formData.get("maximumParticipants"),
      minimumTeamSize: formData.get("minimumTeamSize") || undefined,
      maximumTeamSize: formData.get("maximumTeamSize") || undefined,
      startsAt: formData.get("startsAt"),
      endsAt: formData.get("endsAt"),
      rules: formData.get("rules") ?? "",
      requirements: formData.get("requirements") ?? "",
    });
    if (!parsed.success)
      return {
        status: "error",
        message:
          parsed.error.issues[0]?.message ?? "Review the event configuration.",
      };
    const value = parsed.data;
    const { error } = await supabase.from("events").insert({
      sports_meet_id: value.meetId,
      sport_category_id: value.categoryId,
      code: value.code,
      name: value.name,
      description: value.description,
      event_type: value.eventType,
      format_code: value.formatCode,
      maximum_participants_per_house: value.maximumParticipants,
      minimum_team_size:
        value.eventType === "team" ? value.minimumTeamSize : null,
      maximum_team_size:
        value.eventType === "team" ? value.maximumTeamSize : null,
      starts_at: iso(value.startsAt),
      ends_at: iso(value.endsAt),
      scheduled_at: iso(value.startsAt),
      rules: value.rules ? { text: value.rules } : {},
      requirements: value.requirements ? { text: value.requirements } : {},
      status: "scheduled",
      registration_status: "closed",
    });
    if (error)
      return {
        status: "error",
        message: databaseMessage(error, "The event could not be created."),
      };
    revalidatePath(`/admin/meets/${value.meetId}`);
    return {
      status: "success",
      message: "Event created with registration closed.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function setEventRegistrationAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(meetManagerRoles);
    const id = String(formData.get("id"));
    const meetId = String(formData.get("meetId"));
    const status = formData.get("status") === "open" ? "open" : "closed";
    const { data, error } = await supabase
      .from("events")
      .update({ registration_status: status })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error || !data)
      return {
        status: "error",
        message: databaseMessage(
          error,
          "Event registration could not be changed.",
        ),
      };
    revalidatePath(`/admin/meets/${meetId}`);
    return { status: "success", message: `Event registration is ${status}.` };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function transitionEventAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(meetManagerRoles);
    const parsed = z
      .object({
        id: z.uuid(),
        meetId: z.uuid(),
        status: z.enum([
          "check_in_open",
          "in_progress",
          "completed",
          "cancelled",
        ]),
      })
      .safeParse({
        id: formData.get("id"),
        meetId: formData.get("meetId"),
        status: formData.get("status"),
      });
    if (!parsed.success)
      return { status: "error", message: "Invalid event transition." };
    const { data, error } = await supabase
      .from("events")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.id)
      .select("id")
      .maybeSingle();
    if (error || !data)
      return {
        status: "error",
        message: databaseMessage(
          error,
          "The event status could not be changed.",
        ),
      };
    revalidatePath(`/admin/meets/${parsed.data.meetId}`);
    return {
      status: "success",
      message: `Event changed to ${parsed.data.status.replaceAll("_", " ")}.`,
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}
