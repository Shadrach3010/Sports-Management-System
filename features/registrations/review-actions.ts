"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/features/shared/action-state";
import { getSafeActionError, requireRoles } from "@/lib/auth/authorization";
import { meetManagerRoles, registrationReviewerRoles } from "@/lib/auth/roles";

const uuid = z.uuid();

export async function reviewRosterAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(registrationReviewerRoles);
    const parsed = z
      .object({
        submissionId: uuid,
        decision: z.enum(["approved", "rejected"]),
        reason: z.string().trim().max(1000),
      })
      .safeParse({
        submissionId: formData.get("submissionId"),
        decision: formData.get("decision"),
        reason: formData.get("reason") ?? "",
      });
    if (
      !parsed.success ||
      (parsed.data.decision === "rejected" && parsed.data.reason.length < 5)
    )
      return {
        status: "error",
        message: "A valid decision and rejection reason are required.",
      };
    const { error } = await supabase.rpc("review_event_roster", {
      p_submission_id: parsed.data.submissionId,
      p_decision: parsed.data.decision,
      p_reason: parsed.data.reason || null,
    });
    if (error)
      return {
        status: "error",
        message: error.message.includes("own roster")
          ? "The roster submitter cannot review the same roster."
          : "The roster could not be reviewed.",
      };
    revalidatePath("/admin/registrations");
    return { status: "success", message: `Roster ${parsed.data.decision}.` };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function lockRosterAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(registrationReviewerRoles);
    const parsed = uuid.safeParse(formData.get("eventId"));
    if (!parsed.success) return { status: "error", message: "Invalid event." };
    const { error } = await supabase.rpc("lock_event_roster", {
      p_event_id: parsed.data,
    });
    if (error)
      return {
        status: "error",
        message: error.message.includes("deadline")
          ? "The roster cannot be locked before the deadline."
          : error.message.includes("review")
            ? "Review all submitted rosters before locking."
            : "The roster could not be locked.",
      };
    revalidatePath("/admin/registrations");
    return {
      status: "success",
      message: "The event roster is irreversibly locked.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function decideLateChangeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(meetManagerRoles);
    const parsed = z
      .object({
        requestId: uuid,
        approve: z.enum(["true", "false"]),
        reason: z.string().trim().min(5).max(1000),
      })
      .safeParse({
        requestId: formData.get("requestId"),
        approve: formData.get("approve"),
        reason: formData.get("reason"),
      });
    if (!parsed.success)
      return {
        status: "error",
        message: "Provide a valid independent decision and reason.",
      };
    const { error } = await supabase.rpc("decide_late_roster_addition", {
      p_request_id: parsed.data.requestId,
      p_approve: parsed.data.approve === "true",
      p_reason: parsed.data.reason,
    });
    if (error)
      return {
        status: "error",
        message: error.message.includes("own")
          ? "The requester cannot approve this exception."
          : "The late-change request could not be decided.",
      };
    revalidatePath("/admin/registrations");
    return {
      status: "success",
      message: `Late addition ${parsed.data.approve === "true" ? "approved" : "rejected"}.`,
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function assignEventOfficialAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireRoles(meetManagerRoles);
    const parsed = z
      .object({
        eventId: uuid,
        userId: uuid,
        role: z.enum(["event_judge", "check_in_officer"]),
      })
      .safeParse({
        eventId: formData.get("eventId"),
        userId: formData.get("userId"),
        role: formData.get("role"),
      });
    if (!parsed.success)
      return { status: "error", message: "Select a valid event official." };
    const { error } = await supabase.from("event_officials").upsert(
      {
        event_id: parsed.data.eventId,
        user_id: parsed.data.userId,
        official_role: parsed.data.role,
        assigned_by: userId,
      },
      { onConflict: "event_id,user_id,official_role" },
    );
    if (error)
      return {
        status: "error",
        message:
          "The official could not be assigned. Confirm that the account has the matching role.",
      };
    revalidatePath("/admin/registrations");
    return { status: "success", message: "Event official assigned." };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function voidAttendanceAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(meetManagerRoles);
    const parsed = z
      .object({ attendanceId: uuid, reason: z.string().trim().min(5).max(500) })
      .safeParse({
        attendanceId: formData.get("attendanceId"),
        reason: formData.get("reason"),
      });
    if (!parsed.success)
      return { status: "error", message: "Provide a valid correction reason." };
    const { error } = await supabase.rpc("void_attendance", {
      p_attendance_id: parsed.data.attendanceId,
      p_reason: parsed.data.reason,
    });
    if (error)
      return {
        status: "error",
        message: error.message.includes("independent")
          ? "The original check-in officer cannot approve this correction."
          : "The attendance correction was denied.",
      };
    revalidatePath("/admin/registrations");
    return {
      status: "success",
      message: "Attendance voided with an immutable correction record.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}
