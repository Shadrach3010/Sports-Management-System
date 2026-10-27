"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/features/shared/action-state";
import {
  eligibilityInputSchema,
  studentInputSchema,
} from "@/features/students/schemas";
import { getSafeActionError, requireRoles } from "@/lib/auth/authorization";
import { studentManagerRoles } from "@/lib/auth/roles";

function studentDatabaseMessage(code?: string) {
  return code === "23505"
    ? "That student number already exists."
    : "The student record could not be saved.";
}

function parseStudent(formData: FormData) {
  return studentInputSchema.safeParse({
    id: formData.get("id") || undefined,
    studentNumber: formData.get("studentNumber"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    otherNames: formData.get("otherNames") ?? "",
    academicStatus: formData.get("academicStatus"),
    houseId: formData.get("houseId"),
  });
}

export async function createStudentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(studentManagerRoles);
    const parsed = parseStudent(formData);
    if (!parsed.success)
      return {
        status: "error",
        message: "Review the student details.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    const { data, error } = await supabase
      .from("students")
      .insert({
        student_number: parsed.data.studentNumber,
        legal_first_name: parsed.data.firstName,
        legal_last_name: parsed.data.lastName,
        other_names: parsed.data.otherNames,
        enrollment_status: parsed.data.academicStatus,
        house_id: parsed.data.houseId,
        eligibility_status: "unverified",
      })
      .select("id")
      .single();
    if (error)
      return { status: "error", message: studentDatabaseMessage(error.code) };
    revalidatePath("/admin/students");
    revalidatePath("/admin");
    return {
      status: "success",
      message: `The student was added with unverified eligibility. Record ${data.id.slice(0, 8)} was created.`,
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function updateStudentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(studentManagerRoles);
    const parsed = parseStudent(formData);
    if (!parsed.success || !parsed.data.id)
      return {
        status: "error",
        message: "Review the student details.",
        fieldErrors: parsed.success
          ? undefined
          : parsed.error.flatten().fieldErrors,
      };
    const { data, error } = await supabase
      .from("students")
      .update({
        student_number: parsed.data.studentNumber,
        legal_first_name: parsed.data.firstName,
        legal_last_name: parsed.data.lastName,
        other_names: parsed.data.otherNames,
        enrollment_status: parsed.data.academicStatus,
        house_id: parsed.data.houseId,
      })
      .eq("id", parsed.data.id)
      .select("id")
      .maybeSingle();
    if (error || !data)
      return {
        status: "error",
        message: studentDatabaseMessage(error?.code),
      };
    revalidatePath(`/admin/students/${parsed.data.id}`);
    revalidatePath("/admin/students");
    return {
      status: "success",
      message: "The official student record was updated.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function verifyEligibilityAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(studentManagerRoles);
    const parsed = eligibilityInputSchema.safeParse({
      studentId: formData.get("studentId"),
      status: formData.get("status"),
      reason: formData.get("reason") ?? "",
    });
    if (!parsed.success)
      return {
        status: "error",
        message:
          parsed.error.issues[0]?.message ??
          "Review the verification decision.",
      };
    const { error } = await supabase.rpc("verify_student_eligibility", {
      p_student_id: parsed.data.studentId,
      p_status: parsed.data.status,
      p_reason: parsed.data.reason,
    });
    if (error)
      return {
        status: "error",
        message: error.message.includes("unchanged")
          ? "Choose a different eligibility status."
          : "Eligibility could not be changed.",
      };
    revalidatePath(`/admin/students/${parsed.data.studentId}`);
    revalidatePath("/admin/students");
    revalidatePath("/admin");
    return {
      status: "success",
      message: "Eligibility was updated and added to the protected history.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function setStudentPublicationAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(studentManagerRoles);
    const studentId = formData.get("studentId");
    const publicName = String(formData.get("publicName") ?? "").trim();
    const consent = formData.get("consent") === "on";
    if (
      typeof studentId !== "string" ||
      !studentId ||
      (consent && publicName.length < 2)
    )
      return {
        status: "error",
        message: "Record an approved public name before enabling publication.",
      };
    const { error } = await supabase.rpc("set_student_public_result_identity", {
      p_student_id: studentId,
      p_public_name: publicName,
      p_consent: consent,
    });
    if (error)
      return {
        status: "error",
        message: "The public result identity decision could not be saved.",
      };
    revalidatePath(`/admin/students/${studentId}`);
    revalidatePath("/");
    return {
      status: "success",
      message: consent
        ? "Approved public result name enabled."
        : "Public result name withheld.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}
