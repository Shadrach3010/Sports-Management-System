import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { ApplicationRole } from "@/lib/auth/roles";

export class AuthenticationRequiredError extends Error {}
export class AuthorizationDeniedError extends Error {}

export type AuthorizedContext = {
  supabase: SupabaseClient;
  userId: string;
  roles: ApplicationRole[];
};

export async function requireRoles(
  allowedRoles: readonly ApplicationRole[],
): Promise<AuthorizedContext> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== "string") {
    throw new AuthenticationRequiredError("A verified session is required.");
  }

  const [
    { data: roleRows, error: roleError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
    supabase
      .from("profiles")
      .select("is_active")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (roleError || profileError || !profile?.is_active) {
    throw new AuthorizationDeniedError(
      "Role assignments could not be verified.",
    );
  }

  const roles = (roleRows ?? [])
    .map((row) => row.role)
    .filter((role): role is ApplicationRole =>
      allowedRoles.includes(role as ApplicationRole),
    );

  if (roles.length === 0) {
    throw new AuthorizationDeniedError("You do not have access to this area.");
  }

  return { supabase, userId, roles };
}

export function getSafeActionError(error: unknown, fallback?: string): string {
  if (error instanceof AuthenticationRequiredError) return error.message;
  if (error instanceof AuthorizationDeniedError) return error.message;
  return (
    fallback ??
    "The operation could not be completed. No unauthorized changes were applied."
  );
}
