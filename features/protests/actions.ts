"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/features/shared/action-state";
import { getSafeActionError, requireRoles } from "@/lib/auth/authorization";
import { protestWorkspaceRoles } from "@/lib/auth/roles";

const uuid = z.uuid();

export async function createProtestGroundAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireRoles([
      "system_administrator",
      "sports_coordinator",
    ]);
    const parsed = z
      .object({
        meetId: uuid,
        code: z
          .string()
          .trim()
          .toUpperCase()
          .min(2)
          .max(30)
          .regex(/^[A-Z0-9_-]+$/),
        name: z.string().trim().min(2).max(120),
        description: z.string().trim().max(1000),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return { status: "error", message: "Review the protest category." };
    const { error } = await supabase.from("protest_ground_categories").insert({
      sports_meet_id: parsed.data.meetId,
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description || null,
      created_by: userId,
    });
    if (error)
      return {
        status: "error",
        message:
          error.code === "23505"
            ? "That protest category already exists for the meet."
            : "The protest category could not be created.",
      };
    revalidatePath("/protests");
    return { status: "success", message: "Approved protest category added." };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function fileProtestAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(["house_representative"]);
    const parsed = z
      .object({
        resultId: uuid,
        groundsCode: z.string().trim().min(2).max(80),
        grounds: z.string().trim().min(10).max(3000),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return {
        status: "error",
        message: "Select a result and provide specific grounds.",
      };
    const { error } = await supabase.rpc("file_protest", {
      p_result_id: parsed.data.resultId,
      p_grounds_code: parsed.data.groundsCode,
      p_grounds: parsed.data.grounds,
    });
    if (error)
      return {
        status: "error",
        message: error.message.includes("window")
          ? "The configured protest window is closed or unavailable."
          : "The protest could not be filed.",
      };
    revalidatePath("/protests");
    return {
      status: "success",
      message: "Protest filed and the result marked disputed for review.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function addProtestEvidenceAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase, userId } = await requireRoles(protestWorkspaceRoles);
    const parsed = z
      .object({
        protestId: uuid,
        referenceType: z.enum([
          "document",
          "image",
          "video",
          "witness",
          "other",
        ]),
        reference: z.string().trim().min(3).max(1000),
        description: z.string().trim().max(1000),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return {
        status: "error",
        message: "Provide a safe evidence reference and type.",
      };
    const { error } = await supabase.from("protest_evidence").insert({
      protest_id: parsed.data.protestId,
      reference_type: parsed.data.referenceType,
      reference: parsed.data.reference,
      description: parsed.data.description || null,
      submitted_by: userId,
    });
    if (error)
      return {
        status: "error",
        message: "Evidence was not accepted for this case.",
      };
    revalidatePath("/protests");
    return {
      status: "success",
      message: "Evidence reference recorded. No external file was uploaded.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function assignProtestReviewerAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles([
      "system_administrator",
      "protest_committee",
    ]);
    const parsed = z
      .object({ protestId: uuid, reviewerId: uuid })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return { status: "error", message: "Select a valid reviewer." };
    const { error } = await supabase.rpc("assign_protest_reviewer", {
      p_protest_id: parsed.data.protestId,
      p_reviewer_id: parsed.data.reviewerId,
    });
    if (error)
      return {
        status: "error",
        message: error.message.includes("conflict")
          ? "That reviewer has a conflict of interest."
          : "Reviewer assignment failed.",
      };
    revalidatePath("/protests");
    return {
      status: "success",
      message: "Independent reviewer assigned and notified.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function decideProtestAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(["protest_committee"]);
    const parsed = z
      .object({
        protestId: uuid,
        uphold: z.enum(["true", "false"]),
        findings: z.string().trim().min(5).max(3000),
        decision: z.string().trim().min(5).max(3000),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return {
        status: "error",
        message: "Record complete findings and a decision.",
      };
    const { error } = await supabase.rpc("decide_protest", {
      p_protest_id: parsed.data.protestId,
      p_uphold: parsed.data.uphold === "true",
      p_findings: parsed.data.findings,
      p_decision: parsed.data.decision,
    });
    if (error)
      return {
        status: "error",
        message: error.message.includes("conflict")
          ? "You cannot decide this case because of a conflict."
          : "Only an assigned independent reviewer can decide this case.",
      };
    revalidatePath("/protests");
    return {
      status: "success",
      message: "Protest decision recorded and the filer notified.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}
