"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/features/shared/action-state";
import { getSafeActionError, requireRoles } from "@/lib/auth/authorization";
import { applicationRoles } from "@/lib/auth/roles";

const nullableUuid = z.preprocess(
  (value) => (value === "" ? null : value),
  z.uuid().nullable(),
);

export async function provisionStaffUserAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(["system_administrator"]);
    const parsed = z
      .object({
        userId: z.uuid(),
        displayName: z.string().trim().min(2).max(160),
        role: z.enum(applicationRoles),
        houseId: nullableUuid,
        eventId: nullableUuid,
        expiresAt: z.preprocess(
          (value) => (value === "" ? null : value),
          z.iso.datetime({ local: true }).nullable(),
        ),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return {
        status: "error",
        message: "Review the Auth UUID, display name, role and scope.",
      };
    const { role, houseId, eventId } = parsed.data;
    if (
      (role === "house_representative" && (!houseId || eventId)) ||
      (role === "event_judge" && (!eventId || houseId)) ||
      (!["house_representative", "event_judge"].includes(role) &&
        (houseId || eventId))
    )
      return {
        status: "error",
        message:
          "House representatives require one house, event judges require one event, and global roles cannot carry a scope.",
      };
    const { error } = await supabase.rpc("provision_staff_user", {
      p_user_id: parsed.data.userId,
      p_display_name: parsed.data.displayName,
      p_role: role,
      p_house_id: houseId,
      p_event_id: eventId,
      p_expires_at: parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt).toISOString()
        : null,
    });
    if (error)
      return {
        status: "error",
        message: error.message.includes("does not exist")
          ? "Create the account in Supabase Auth first, then use its UUID here."
          : "The profile or role assignment was rejected.",
      };
    revalidatePath("/admin/users");
    return {
      status: "success",
      message: "Staff profile and scoped role assignment saved.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}
