"use server";

import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/features/shared/action-state";
import { getSafeActionError, requireRoles } from "@/lib/auth/authorization";
import { registrationWorkspaceRoles } from "@/lib/auth/roles";

const id = z.uuid();

export async function registerParticipantAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(registrationWorkspaceRoles);
    const parsed = z
      .object({
        eventId: id,
        studentId: id,
        teamId: z.union([id, z.literal("")]),
      })
      .safeParse({
        eventId: formData.get("eventId"),
        studentId: formData.get("studentId"),
        teamId: formData.get("teamId") ?? "",
      });
    if (!parsed.success)
      return {
        status: "error",
        message: "Select a valid event, athlete, and team where required.",
      };
    const { error } = await supabase.rpc("register_event_participant", {
      p_event_id: parsed.data.eventId,
      p_student_id: parsed.data.studentId,
      p_team_id: parsed.data.teamId || null,
      p_submit: false,
    });
    if (error)
      return {
        status: "error",
        message: error.message.includes("eligible")
          ? "Only enrolled, verified-eligible students can be registered."
          : error.message.includes("limit")
            ? "The participant limit has been reached."
            : error.message.includes("duplicate") || error.code === "23505"
              ? "This student is already entered in the event."
              : "The participant could not be added.",
      };
    revalidatePath(`/registration/${parsed.data.eventId}`);
    return { status: "success", message: "Athlete added to the draft roster." };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function createTeamAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(["house_representative"]);
    const parsed = z
      .object({ eventId: id, name: z.string().trim().min(2).max(100) })
      .safeParse({
        eventId: formData.get("eventId"),
        name: formData.get("name"),
      });
    if (!parsed.success)
      return { status: "error", message: "Enter a valid team name." };
    const { error } = await supabase.rpc("create_event_team", {
      p_event_id: parsed.data.eventId,
      p_name: parsed.data.name,
    });
    if (error)
      return { status: "error", message: "The team could not be created." };
    revalidatePath(`/registration/${parsed.data.eventId}`);
    return { status: "success", message: "Team created." };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function submitRosterAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(registrationWorkspaceRoles);
    const parsed = z.object({ eventId: id, houseId: id }).safeParse({
      eventId: formData.get("eventId"),
      houseId: formData.get("houseId"),
    });
    if (!parsed.success) return { status: "error", message: "Invalid roster." };
    const { error } = await supabase.rpc("submit_event_roster", {
      p_event_id: parsed.data.eventId,
      p_house_id: parsed.data.houseId,
    });
    if (error)
      return {
        status: "error",
        message: error.message.includes("size")
          ? "A team is outside the permitted roster size."
          : "The roster could not be submitted.",
      };
    revalidatePath(`/registration/${parsed.data.eventId}`);
    revalidatePath("/admin/registrations");
    return {
      status: "success",
      message: "Roster submitted for independent review.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function withdrawRegistrationAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(registrationWorkspaceRoles);
    const parsed = z
      .object({
        registrationId: id,
        eventId: id,
        reason: z.string().trim().max(500),
      })
      .safeParse({
        registrationId: formData.get("registrationId"),
        eventId: formData.get("eventId"),
        reason: formData.get("reason") ?? "",
      });
    if (!parsed.success)
      return { status: "error", message: "Invalid withdrawal request." };
    const { error } = await supabase.rpc("withdraw_event_registration", {
      p_registration_id: parsed.data.registrationId,
      p_reason: parsed.data.reason || null,
    });
    if (error)
      return {
        status: "error",
        message: error.message.includes("locked")
          ? "Locked rosters require the documented exception process."
          : "The entry could not be withdrawn.",
      };
    revalidatePath(`/registration/${parsed.data.eventId}`);
    return {
      status: "success",
      message: "Entry withdrawn without deleting its history.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function requestLateAdditionAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(["house_representative"]);
    const parsed = z
      .object({
        eventId: id,
        studentId: id,
        teamId: z.union([id, z.literal("")]),
        reason: z.string().trim().min(5).max(1000),
      })
      .safeParse({
        eventId: formData.get("eventId"),
        studentId: formData.get("studentId"),
        teamId: formData.get("teamId") ?? "",
        reason: formData.get("reason"),
      });
    if (!parsed.success)
      return {
        status: "error",
        message: "Select an athlete and provide a meaningful exception reason.",
      };
    const { error } = await supabase.rpc("request_late_roster_addition", {
      p_event_id: parsed.data.eventId,
      p_student_id: parsed.data.studentId,
      p_team_id: parsed.data.teamId || null,
      p_reason: parsed.data.reason,
    });
    if (error)
      return {
        status: "error",
        message: "The late-change request could not be filed.",
      };
    revalidatePath(`/registration/${parsed.data.eventId}`);
    return {
      status: "success",
      message: "Late-change request filed for independent authorization.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function issueQrPassAction(
  _state: ActionState<{ dataUrl: string; token: string }>,
  formData: FormData,
): Promise<ActionState<{ dataUrl: string; token: string }>> {
  try {
    const { supabase } = await requireRoles(registrationWorkspaceRoles);
    const registrationId = id.safeParse(formData.get("registrationId"));
    if (!registrationId.success)
      return { status: "error", message: "Invalid registration." };
    const { data, error } = await supabase.rpc("issue_registration_token", {
      p_registration_id: registrationId.data,
    });
    if (error || typeof data !== "string")
      return {
        status: "error",
        message: "A pass can only be issued for an approved entry.",
      };
    const dataUrl = await QRCode.toDataURL(data, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
    });
    return {
      status: "success",
      message:
        "Pass issued. Save it now; the opaque token is not stored in readable form.",
      data: { dataUrl, token: data },
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}
