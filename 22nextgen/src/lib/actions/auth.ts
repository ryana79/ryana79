"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fail, type ActionResult } from "@/lib/actions/result";
import { fieldErrorsFrom, safeNext, signInSchema, signUpSchema } from "@/lib/validation/public";
import { siteUrl } from "@/lib/env";
import { hasAnyRole, ROLE_GROUPS } from "@/lib/permissions";

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return fail("Check your email and password.", fieldErrorsFrom(parsed.error));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error || !data.user) return fail("Incorrect email or password.");
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
  const isStaff = hasAnyRole((roles ?? []).map((r) => r.role), ROLE_GROUPS.staff);
  redirect(safeNext(parsed.data.next, isStaff ? "/admin" : "/dashboard"));
}

export async function signUp(input: unknown): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the highlighted fields.", fieldErrorsFrom(parsed.error));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.display_name }, emailRedirectTo: `${siteUrl}/login` },
  });
  if (error) return fail(error.message.includes("registered") ? "An account with that email already exists." : "We couldn't create your account. Try a stronger password or try again.");
  return { ok: true, data: { needsConfirmation: !data.session } };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
