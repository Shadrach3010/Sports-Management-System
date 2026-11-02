"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionState } from "@/features/shared/action-state";
import { signIn, signOut } from "@/lib/auth/session";

const signInSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(200),
});

export async function signInAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success)
    return {
      status: "error",
      message: "Enter a valid staff email address and password.",
    };
  let authenticated = false;
  try {
    authenticated = await signIn(parsed.data.email, parsed.data.password);
  } catch {
    return {
      status: "error",
      message: "The sign-in service is unavailable. Please try again later.",
    };
  }
  if (!authenticated)
    return {
      status: "error",
      message: "Sign-in failed. Check the credentials and account status.",
    };
  redirect("/workspace");
}

export async function signOutAction() {
  await signOut();
  redirect("/login");
}
