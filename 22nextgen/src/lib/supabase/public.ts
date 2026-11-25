import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabasePublicConfig } from "@/lib/env";

/** Anonymous, cookie-less client for public pages. Only what RLS exposes to `anon` is readable. */
export function createPublicClient() {
  const cfg = supabasePublicConfig();
  if (!cfg) return null;
  return createSupabaseClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
