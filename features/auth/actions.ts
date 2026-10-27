"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionState } from "@/features/shared/action-state";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error)
    return {
      status: "error",
      message: "Sign-in failed. Check the credentials and account status.",
    };
  redirect("/workspace");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
