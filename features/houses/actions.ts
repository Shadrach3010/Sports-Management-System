"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/features/shared/action-state";
import { getSafeActionError, requireRoles } from "@/lib/auth/authorization";
import { houseManagerRoles } from "@/lib/auth/roles";
import { houseInputSchema, houseStatusSchema } from "@/features/houses/schemas";

function databaseMessage(code?: string) {
  return code === "23505"
    ? "A house with that name or code already exists."
    : "The house could not be saved.";
}

export async function createHouseAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(houseManagerRoles);
    const parsed = houseInputSchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
      officialColor: formData.get("officialColor"),
    });
    if (!parsed.success)
      return {
        status: "error",
        message: "Review the highlighted house details.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };

    const { error } = await supabase.from("houses").insert({
      name: parsed.data.name,
      code: parsed.data.code,
      official_color: parsed.data.officialColor,
    });
    if (error) return { status: "error", message: databaseMessage(error.code) };
    revalidatePath("/admin/houses");
    revalidatePath("/admin");
    return { status: "success", message: `${parsed.data.name} was created.` };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function updateHouseAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(houseManagerRoles);
    const parsed = houseInputSchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      code: formData.get("code"),
      officialColor: formData.get("officialColor"),
    });
    if (!parsed.success || !parsed.data.id)
      return {
        status: "error",
        message: "Review the house details.",
        fieldErrors: parsed.success
          ? undefined
          : parsed.error.flatten().fieldErrors,
      };

    const { data, error } = await supabase
      .from("houses")
      .update({
        name: parsed.data.name,
        code: parsed.data.code,
        official_color: parsed.data.officialColor,
      })
      .eq("id", parsed.data.id)
      .select("id")
      .maybeSingle();
    if (error || !data)
      return { status: "error", message: databaseMessage(error?.code) };
    revalidatePath("/admin/houses");
    return { status: "success", message: `${parsed.data.name} was updated.` };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function setHouseStatusAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { supabase } = await requireRoles(houseManagerRoles);
    const parsed = houseStatusSchema.safeParse({
      id: formData.get("id"),
      isActive: formData.get("isActive"),
    });
    if (!parsed.success)
      return {
        status: "error",
        message: "The requested house status was invalid.",
      };
    const { data, error } = await supabase
      .from("houses")
      .update({ is_active: parsed.data.isActive })
      .eq("id", parsed.data.id)
      .select("id")
      .maybeSingle();
    if (error || !data)
      return {
        status: "error",
        message: "The house status could not be changed.",
      };
    revalidatePath("/admin/houses");
    revalidatePath("/admin");
    return {
      status: "success",
      message: parsed.data.isActive
        ? "The house is active."
        : "The house is inactive. Existing student links were preserved.",
    };
  } catch (error) {
    return { status: "error", message: getSafeActionError(error) };
  }
}
