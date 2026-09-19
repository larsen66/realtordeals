import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@supabase/server/core";

export function createSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  const key = secretKey || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "Set SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in the root .env",
    );
  }

  if (key.includes("•") || key.includes("...") || key.startsWith("sb_publishable_")) {
    throw new Error("The API requires a full Supabase secret key, not a masked or publishable key");
  }

  if (secretKey) return createAdminClient();

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
