import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { can, type AppRole, type Capability } from "@/lib/permissions";

export type CurrentUser = { id: string; email: string | null; roles: AppRole[] };

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Verified user (server round-trip to Auth; never trusts the cookie alone) plus their roles. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    roles: (roleRows ?? []).map((r) => r.role as AppRole),
  };
});

/** For pages/layouts: redirect to login or the forbidden screen. */
export async function requireCapability(capability: Capability): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!can(user.roles, capability)) redirect("/admin/forbidden");
  return user;
}

/** For server actions / route handlers: throws rather than redirects. RLS is enforced again in Postgres. */
export async function assertCapability(capability: Capability) {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError("Please sign in.");
  if (!can(user.roles, capability)) throw new ForbiddenError();
  const supabase = await createClient();
  return { user, supabase };
}
