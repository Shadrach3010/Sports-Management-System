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
      return {
        status: "error",
        message:
          error.code === "23505" || error.message.includes("unique")
            ? "This athlete has already checked in. A correction requires independent authorization."
            : error.message.includes("invalid")
              ? "The token is invalid, revoked, or belongs to another event."
              : "Check-in was denied.",
      };
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
      return {
        status: "error",
        message:
          error.code === "23505"
            ? "This athlete has already checked in."
            : "Manual check-in was denied.",
      };
    revalidatePath(`/check-in/${parsed.data.eventId}`);
    return {
      status: "success",
      message: "Manual check-in recorded with its reason.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}
