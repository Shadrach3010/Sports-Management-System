import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { currentUserId, rlsToken } from "@/lib/auth/session";
import { getPublicEnvironment } from "@/lib/env";

export async function createClient() {
  const environment = getPublicEnvironment();
  const userId = await currentUserId();
  return createSupabaseClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      accessToken: async () => (userId ? rlsToken(userId) : null),
    },
  );
}
