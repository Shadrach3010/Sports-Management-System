"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/features/shared/action-state";
import { getSafeActionError, requireRoles } from "@/lib/auth/authorization";
import { checkInWorkspaceRoles } from "@/lib/auth/roles";

type CheckInResult = {
  studentNumber: string;
  displayName: string;
  houseName: string;
};
const schema = z.object({
  eventId: z.uuid(),
  identityConfirmed: z.literal("true"),
});

function checkInErrorMessage(
  error: { code?: string; message: string },
  method: "qr" | "manual",
) {
  const message = error.message.toLowerCase();
  if (
    error.code === "23505" ||
    message.includes("duplicate key") ||
    message.includes("already checked")
  )
    return "This athlete has already checked in. A correction requires independent authorization.";
  if (message.includes("check-in is not open"))
    return "Check-in is closed for this event. A meet manager must open event check-in first.";
  if (message.includes("assigned check-in officer role required"))
    return "You are not assigned to check in athletes for this event.";
  if (message.includes("physical identity confirmation"))
    return "Confirm the athlete's physical identity before check-in.";
  if (
    message.includes("invalid registration token") ||
    message.includes("token does not identify")
  )
    return "The pass is invalid, revoked, or belongs to another event. Ask for the current pass.";
  if (message.includes("manual check-in requires an approved entry"))
    return "This athlete's roster entry is not approved or has already been checked in.";
  return method === "qr"
    ? "QR check-in was denied. Verify the event, pass, and approved entry."
    : "Manual check-in was denied. Verify the event and approved entry.";
}

export async function tokenCheckInAction(
  _state: ActionState<CheckInResult>,
  formData: FormData,
): Promise<ActionState<CheckInResult>> {
  try {
    const { supabase } = await requireRoles(checkInWorkspaceRoles);
    const parsed = schema
      .extend({ token: z.string().trim().min(20).max(200) })
      .safeParse({
        eventId: formData.get("eventId"),
        token: formData.get("token"),
        identityConfirmed: formData.get("identityConfirmed"),
      });
    if (!parsed.success)
      return {
        status: "error",
        message: "Enter a valid token and confirm physical identity.",
      };
    const { data, error } = await supabase.rpc("check_in_with_token", {
      p_event_id: parsed.data.eventId,
      p_token: parsed.data.token,
      p_identity_confirmed: true,
    });
    if (error)
      return { status: "error", message: checkInErrorMessage(error, "qr") };
    const row = (
      data as
        | { student_number: string; display_name: string; house_name: string }[]
        | null
    )?.[0];
    if (!row)
      return { status: "error", message: "No approved athlete was found." };
    revalidatePath(`/check-in/${parsed.data.eventId}`);
    return {
      status: "success",
      message: "Check-in recorded after physical identity confirmation.",
      data: {
        studentNumber: row.student_number,
        displayName: row.display_name,
        houseName: row.house_name,
      },
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function manualCheckInAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(checkInWorkspaceRoles);
    const parsed = schema
      .extend({
        registrationId: z.uuid(),
        reason: z.string().trim().min(5).max(500),
      })
      .safeParse({
        eventId: formData.get("eventId"),
        registrationId: formData.get("registrationId"),
        reason: formData.get("reason"),
        identityConfirmed: formData.get("identityConfirmed"),
      });
    if (!parsed.success)
      return {
        status: "error",
        message:
          "Select an approved athlete, confirm identity, and record a fallback reason.",
      };
    const { error } = await supabase.rpc("manual_check_in", {
      p_event_id: parsed.data.eventId,
      p_registration_id: parsed.data.registrationId,
      p_identity_confirmed: true,
      p_reason: parsed.data.reason,
    });
    if (error)
      return { status: "error", message: checkInErrorMessage(error, "manual") };
    revalidatePath(`/check-in/${parsed.data.eventId}`);
    return {
      status: "success",
      message: "Manual check-in recorded with its reason.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}
