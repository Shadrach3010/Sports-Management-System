"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/features/shared/action-state";
import {
  resultInputSchema,
  reviewResultSchema,
} from "@/features/results/schemas";
import { getSafeActionError, requireRoles } from "@/lib/auth/authorization";
import {
  resultEntryRoles,
  resultReviewRoles,
  scoringManagerRoles,
} from "@/lib/auth/roles";

const nullable = <T>(value: T | undefined) => value ?? null;

export async function saveResultAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(resultEntryRoles);
    const parsed = resultInputSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return {
        status: "error",
        message: parsed.error.issues[0]?.message ?? "Review the result values.",
      };
    const [entrantType, entrantId] = parsed.data.entrant.split(":");
    const { error } = await supabase.rpc("save_result", {
      p_result_id: parsed.data.resultId ?? null,
      p_event_id: parsed.data.eventId,
      p_registration_id: entrantType === "registration" ? entrantId : null,
      p_team_id: entrantType === "team" ? entrantId : null,
      p_outcome: parsed.data.outcome,
      p_placement: nullable(parsed.data.placement),
      p_time_milliseconds: nullable(parsed.data.timeMilliseconds),
      p_distance_millimetres: nullable(parsed.data.distanceMillimetres),
      p_height_millimetres: nullable(parsed.data.heightMillimetres),
      p_performance_score: nullable(parsed.data.performanceScore),
      p_tie_group: parsed.data.tieGroup || null,
      p_anomaly_note: parsed.data.anomalyNote || null,
      p_submit: parsed.data.intent === "submit",
    });
    if (error)
      return {
        status: "error",
        message: error.message.includes("placement")
          ? "Placement conflicts with another result. Record an explicit tie group where the rules permit a tie."
          : "The result was rejected by the competition integrity rules.",
      };
    revalidatePath("/result-entry");
    revalidatePath("/admin/results");
    return {
      status: "success",
      message:
        parsed.data.intent === "submit"
          ? "Result submitted for independent verification."
          : "Result saved as a draft.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function reviewResultAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles([
      "system_administrator",
      "results_verifier",
    ]);
    const parsed = reviewResultSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return {
        status: "error",
        message: "Provide a decision and review reason.",
      };
    const { error } = await supabase.rpc("review_result", {
      p_result_id: parsed.data.resultId,
      p_decision: parsed.data.decision,
      p_reason: parsed.data.reason,
    });
    if (error)
      return {
        status: "error",
        message: error.message.includes("own result")
          ? "The submitting judge cannot verify this result."
          : "The review decision was rejected.",
      };
    revalidatePath("/admin/results");
    return { status: "success", message: `Result ${parsed.data.decision}.` };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function finalizeResultAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(scoringManagerRoles);
    const parsed = z
      .object({
        resultId: z.uuid(),
        publish: z.enum(["true", "false"]),
        reason: z.string().trim().min(5).max(1000),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return { status: "error", message: "Provide a valid decision reason." };
    const { error } = await supabase.rpc("finalize_result", {
      p_result_id: parsed.data.resultId,
      p_publish: parsed.data.publish === "true",
      p_reason: parsed.data.reason,
    });
    if (error)
      return {
        status: "error",
        message: error.message.includes("independent")
          ? "Final approval must be performed by an independent official."
          : "The result could not be finalized or published.",
      };
    revalidatePath("/admin/results");
    revalidatePath("/public/results");
    return { status: "success", message: "Result lifecycle updated." };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function scoreResultAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(scoringManagerRoles);
    const parsed = z
      .object({
        resultId: z.uuid(),
        reason: z.string().trim().min(5).max(500),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return { status: "error", message: "A scoring reason is required." };
    const { error } = await supabase.rpc("score_result", {
      p_result_id: parsed.data.resultId,
      p_reason: parsed.data.reason,
    });
    if (error)
      return {
        status: "error",
        message:
          "Scoring failed. Confirm an independently approved rule is assigned and the tie policy is resolved.",
      };
    revalidatePath("/admin/results");
    revalidatePath("/standings");
    return {
      status: "success",
      message: "Points generated from the approved result revision.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function requestResultCorrectionAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(resultReviewRoles);
    const optionalPositive = z.preprocess(
      (value) => (value === "" ? null : value),
      z.coerce.number().int().positive().nullable(),
    );
    const parsed = z
      .object({
        resultId: z.uuid(),
        outcome: z.enum([
          "ranked",
          "did_not_start",
          "did_not_finish",
          "disqualified",
          "withdrawn",
          "abandoned",
        ]),
        placement: optionalPositive,
        time: optionalPositive,
        distance: optionalPositive,
        height: optionalPositive,
        score: z.preprocess(
          (value) => (value === "" ? null : value),
          z.coerce.number().nullable(),
        ),
        tieGroup: z.string().trim().max(40),
        reason: z.string().trim().min(5).max(1000),
      })
      .safeParse(Object.fromEntries(formData));
    if (
      !parsed.success ||
      (parsed.data.outcome === "ranked") !== (parsed.data.placement !== null)
    )
      return {
        status: "error",
        message:
          "Provide a consistent corrected outcome, placement and reason.",
      };
    const { error } = await supabase.rpc("request_result_correction", {
      p_result_id: parsed.data.resultId,
      p_outcome: parsed.data.outcome,
      p_placement: parsed.data.placement,
      p_time: parsed.data.time,
      p_distance: parsed.data.distance,
      p_height: parsed.data.height,
      p_score: parsed.data.score,
      p_tie_group: parsed.data.tieGroup || null,
      p_reason: parsed.data.reason,
    });
    if (error)
      return {
        status: "error",
        message: "The correction request could not be recorded.",
      };
    revalidatePath("/admin/results");
    return {
      status: "success",
      message: "Correction requested for independent approval.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function decideResultCorrectionAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(scoringManagerRoles);
    const parsed = z
      .object({
        requestId: z.uuid(),
        approve: z.enum(["true", "false"]),
        reason: z.string().trim().min(5).max(1000),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return {
        status: "error",
        message: "Provide an independent correction decision and reason.",
      };
    const { error } = await supabase.rpc("decide_result_correction", {
      p_request_id: parsed.data.requestId,
      p_approve: parsed.data.approve === "true",
      p_reason: parsed.data.reason,
    });
    if (error)
      return {
        status: "error",
        message: error.message.includes("independent")
          ? "The requester cannot approve their own correction."
          : "The correction decision failed.",
      };
    revalidatePath("/admin/results");
    revalidatePath("/public/results");
    revalidatePath("/standings");
    return {
      status: "success",
      message:
        "Correction decision recorded; prior awards were voided if the change was approved.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}
