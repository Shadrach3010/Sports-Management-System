"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/features/shared/action-state";
import { getSafeActionError, requireRoles } from "@/lib/auth/authorization";
import { applicationRoles } from "@/lib/auth/roles";
import { createStaffAccount, manageStaffAccount } from "@/lib/auth/session";

const nullableUuid = z.preprocess(
  (value) => (value === "" ? null : value),
  z.uuid().nullable(),
);

export async function provisionStaffUserAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { userId: actorId } = await requireRoles(["system_administrator"]);
    const parsed = z
      .object({
        email: z.email().trim().toLowerCase(),
        displayName: z.string().trim().min(2).max(160),
        password: z.string().min(12).max(200),
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
        message:
          "Enter a valid email, name, password of at least 12 characters, role and scope.",
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
    await createStaffAccount({
      actorId,
      email: parsed.data.email,
      displayName: parsed.data.displayName,
      password: parsed.data.password,
      role,
      houseId,
      eventId,
      expiresAt: parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt).toISOString()
        : null,
    });
    revalidatePath("/admin/users");
    return {
      status: "success",
      message:
        "Staff account created. Share the initial password through an approved private channel.",
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "23505"
    )
      return {
        status: "error",
        message: "That email address already has an account.",
      };
    return { status: "error", message: getSafeActionError(error) };
  }
}

export async function manageStaffUserAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { userId: actorId } = await requireRoles(["system_administrator"]);
    const operation = z
      .enum(["edit", "activate", "deactivate", "archive"])
      .safeParse(formData.get("operation"));
    const targetId = z.uuid().safeParse(formData.get("targetId"));
    if (!operation.success || !targetId.success)
      return { status: "error", message: "Invalid account request." };
    if (operation.data === "archive" && formData.get("confirmArchive") !== "on")
      return { status: "error", message: "Confirm account removal first." };
    let details: {
      email?: string;
      displayName?: string;
      role?: (typeof applicationRoles)[number];
      houseId?: string | null;
      eventId?: string | null;
    } = {};
    if (operation.data === "edit") {
      const parsed = z
        .object({
          email: z.email().trim().toLowerCase(),
          displayName: z.string().trim().min(2).max(160),
          role: z.enum(applicationRoles),
          houseId: nullableUuid,
          eventId: nullableUuid,
        })
        .safeParse(Object.fromEntries(formData));
      if (!parsed.success)
        return {
          status: "error",
          message: "Review the account name, email, role and scope.",
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
          message: "The selected role requires its matching scope only.",
        };
      details = parsed.data;
    }
    await manageStaffAccount({
      actorId,
      targetId: targetId.data,
      operation: operation.data,
      ...details,
    });
    revalidatePath("/admin/users");
    return {
      status: "success",
      message:
        operation.data === "archive"
          ? "Account removed from the active directory. Audit history is retained."
          : "Account updated.",
    };
  } catch (error) {
    if (
      error instanceof Error &&
      [
        "Administrator access is required.",
        "Account is unavailable.",
        "You cannot remove your own administrator access.",
        "The last active administrator cannot be removed.",
        "This account needs a single role and complete profile details.",
      ].includes(error.message)
    )
      return { status: "error", message: error.message };
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "23505"
    )
      return {
        status: "error",
        message: "That email or role assignment already exists.",
      };
    return { status: "error", message: getSafeActionError(error) };
  }
}
