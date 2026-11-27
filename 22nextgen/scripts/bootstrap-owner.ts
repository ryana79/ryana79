/**
 * Secure first-Owner bootstrap. Run ONCE from a trusted machine with the service-role key.
 *
 *   OWNER_EMAIL=you@example.com OWNER_PASSWORD='long-random-passphrase' npm run bootstrap:owner
 *
 * - Refuses to run if an Owner already exists (so it cannot be abused later for privilege escalation).
 * - Creates the auth user (email pre-confirmed) when missing, then grants the 'owner' role.
 * - Secrets come from the environment, never argv (shell history).
 * Further roles are granted by an Owner in Admin → Settings → Team.
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("OWNER_EMAIL is required and must be a valid email.");

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { count, error: countError } = await supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "owner");
  if (countError) throw new Error(`Could not check existing owners: ${countError.message}`);
  if ((count ?? 0) > 0) throw new Error("An Owner already exists. Bootstrap is disabled; use Admin → Settings → Team to manage roles.");

  let userId: string | undefined;
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id;
  if (!userId) {
    if (!password || password.length < 12) throw new Error("OWNER_PASSWORD (12+ characters) is required to create a new user.");
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw new Error(`Could not create user: ${error?.message}`);
    userId = data.user.id;
    console.log(`Created user ${email}`);
  }
  const { error: roleError } = await supabase.from("user_roles").insert({ user_id: userId, role: "owner", granted_by: userId });
  if (roleError) throw new Error(`Could not grant owner role: ${roleError.message}`);
  await supabase.rpc("write_audit", { p_action: "bootstrap_owner", p_entity_type: "user_roles", p_entity_id: userId, p_summary: "First owner bootstrapped" });
  console.log(`Owner role granted to ${email}. Log in at /login, then rotate the password if it was shared.`);
}

main().catch((e) => {
  console.error(`Bootstrap failed: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
