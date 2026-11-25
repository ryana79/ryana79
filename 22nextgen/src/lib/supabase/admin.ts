import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverSecrets, supabasePublicConfig } from "@/lib/env";

/**
 * Service-role client: bypasses RLS. Use ONLY for: Jotform webhook ingestion, first-owner bootstrap,
 * role management after an owner check, and account-admin tasks. Never import into client code.
 */
export function createServiceClient() {
  const cfg = supabasePublicConfig();
  const { serviceRoleKey } = serverSecrets();
  if (!cfg || !serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createClient(cfg.url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
