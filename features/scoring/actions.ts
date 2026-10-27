"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/features/shared/action-state";
import { getSafeActionError, requireRoles } from "@/lib/auth/authorization";
import { scoringManagerRoles } from "@/lib/auth/roles";

const uuid = z.uuid();

export async function createScoringRuleAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireRoles(scoringManagerRoles);
    const parsed = z
      .object({
        meetId: uuid,
        name: z.string().trim().min(2).max(120),
        version: z.coerce.number().int().positive(),
        tiePolicy: z.enum(["manual", "equal_points", "shared_average"]),
        notes: z.string().trim().max(1000),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return { status: "error", message: "Review the scoring-rule metadata." };
    const { error } = await supabase.from("scoring_rules").insert({
      sports_meet_id: parsed.data.meetId,
      name: parsed.data.name,
      version: parsed.data.version,
      tie_policy: parsed.data.tiePolicy,
      notes: parsed.data.notes || null,
      definition: { source: "authorized_position_table" },
      status: "draft",
      created_by: userId,
    });
    if (error)
      return {
        status: "error",
        message:
          error.code === "23505"
            ? "That scoring version already exists."
            : "The scoring version could not be created.",
      };
    revalidatePath("/admin/scoring");
    return {
      status: "success",
      message:
        "Draft scoring version created. Add every official placement value before approval.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function addScoringPositionAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(scoringManagerRoles);
    const parsed = z
      .object({
        ruleId: uuid,
        placement: z.coerce.number().int().positive(),
        points: z.coerce.number().nonnegative(),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return {
        status: "error",
        message: "Enter a valid placement and non-negative points value.",
      };
    const { error } = await supabase.from("scoring_rule_positions").upsert(
      {
        scoring_rule_id: parsed.data.ruleId,
        placement: parsed.data.placement,
        points: parsed.data.points,
      },
      { onConflict: "scoring_rule_id,placement" },
    );
    if (error)
      return {
        status: "error",
        message: "Only the creator may edit a draft scoring version.",
      };
    revalidatePath("/admin/scoring");
    return {
      status: "success",
      message: "Placement value saved to the draft version.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function submitScoringRuleAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(scoringManagerRoles);
    const parsed = uuid.safeParse(formData.get("ruleId"));
    if (!parsed.success)
      return { status: "error", message: "Invalid scoring rule." };
    const { data, error } = await supabase
      .from("scoring_rules")
      .update({ status: "pending_approval" })
      .eq("id", parsed.data)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();
    if (error || !data)
      return {
        status: "error",
        message:
          "Only the creator can submit a draft for independent approval.",
      };
    revalidatePath("/admin/scoring");
    return {
      status: "success",
      message: "Scoring version submitted for independent approval.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function activateScoringRuleAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(scoringManagerRoles);
    const parsed = uuid.safeParse(formData.get("ruleId"));
    if (!parsed.success)
      return { status: "error", message: "Invalid scoring rule." };
    const { error } = await supabase.rpc("activate_scoring_rule", {
      p_rule_id: parsed.data,
    });
    if (error)
      return {
        status: "error",
        message: error.message.includes("independent")
          ? "A different authorized manager must approve this scoring version."
          : "The scoring version cannot be activated.",
      };
    revalidatePath("/admin/scoring");
    return {
      status: "success",
      message: "Scoring version independently approved and activated.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function assignScoringRuleAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(scoringManagerRoles);
    const parsed = z
      .object({
        eventId: uuid,
        ruleId: uuid,
        reason: z.string().trim().min(5).max(500),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return {
        status: "error",
        message: "Select an event, active rule, and reason.",
      };
    const { error } = await supabase.rpc("assign_event_scoring_rule", {
      p_event_id: parsed.data.eventId,
      p_rule_id: parsed.data.ruleId,
      p_reason: parsed.data.reason,
    });
    if (error)
      return {
        status: "error",
        message:
          "The rule could not be assigned. Active awards must be resolved first.",
      };
    revalidatePath("/admin/scoring");
    return {
      status: "success",
      message: "Approved scoring version assigned to the event.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function setStandingsStatusAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(scoringManagerRoles);
    const parsed = z
      .object({
        meetId: uuid,
        status: z.enum(["confirmed", "final"]),
        reason: z.string().trim().min(5).max(1000),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return {
        status: "error",
        message: "Select a declaration state and record the reason.",
      };
    const { error } = await supabase.rpc("set_standings_status", {
      p_meet_id: parsed.data.meetId,
      p_status: parsed.data.status,
      p_reason: parsed.data.reason,
    });
    if (error)
      return {
        status: "error",
        message:
          "The declaration was rejected. Confirm the required order, completed meet state, and absence of disputes.",
      };
    revalidatePath("/admin/scoring");
    revalidatePath("/standings");
    return {
      status: "success",
      message: `Standings declared ${parsed.data.status}.`,
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}
