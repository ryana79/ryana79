"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertCapability } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/admin";
import { fail, okay, type ActionResult } from "@/lib/actions/result";
import { dbError, guardError } from "./common";

const uuid = z.string().uuid();

export async function setInquiryStatus(id: string, status: string): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("registrations.view");
    const s = z.enum(["new", "in_progress", "closed"]).safeParse(status);
    if (!uuid.safeParse(id).success || !s.success) return fail("Invalid request.");
    const { error } = await supabase.from("inquiries").update({ status: s.data }).eq("id", id);
    if (error) return dbError("inquiries", error, "inquiry");
    return okay();
  } catch (e) {
    return guardError("inquiries", e);
  }
}

export async function setDataRequestStatus(id: string, status: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await assertCapability("privacy.manage");
    const s = z.enum(["received", "verifying", "in_progress", "completed", "rejected"]).safeParse(status);
    if (!uuid.safeParse(id).success || !s.success) return fail("Invalid request.");
    const done = s.data === "completed" || s.data === "rejected";
    const { error } = await supabase.from("data_requests").update({ status: s.data, handled_by: user.id, handled_at: done ? new Date().toISOString() : null }).eq("id", id);
    if (error) return dbError("privacy", error, "request");
    return okay();
  } catch (e) {
    return guardError("privacy", e);
  }
}

export async function setCoppaWorkflow(approved: boolean): Promise<ActionResult> {
  try {
    const { supabase, user } = await assertCapability("roles.manage");
    const { error } = await supabase.from("site_settings").upsert({ key: "coppa", value: { workflow_approved: approved, note: approved ? "Enabled by owner. Verify counsel approval is on file." : "Under-13 profiles cannot be published." }, is_public: false, updated_by: user.id }, { onConflict: "key" });
    if (error) return dbError("settings", error, "setting");
    revalidatePath("/admin/settings");
    return okay();
  } catch (e) {
    return guardError("settings", e);
  }
}

export async function grantRole(email: string, role: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await assertCapability("roles.manage");
    const r = z.enum(["owner", "admin", "editor", "coach"]).safeParse(role);
    const e = z.string().trim().toLowerCase().email().safeParse(email);
    if (!r.success || !e.success) return fail("Enter a valid email and role.");
    const service = createServiceClient();
    let target: string | undefined;
    for (let page = 1; page <= 10 && !target; page++) {
      const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return fail("Could not look up users.");
      target = data.users.find((u) => u.email?.toLowerCase() === e.data)?.id;
      if (data.users.length < 200) break;
    }
    if (!target) return fail("No account with that email. Ask them to register at /register first.");
    const { error } = await supabase.from("user_roles").insert({ user_id: target, role: r.data, granted_by: user.id });
    if (error) {
      if (error.code === "23505") return fail("They already have that role.");
      return dbError("settings", error, "role");
    }
    revalidatePath("/admin/settings");
    return okay();
  } catch (e) {
    return guardError("settings", e);
  }
}

export async function revokeRole(userId: string, role: string): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("roles.manage");
    const r = z.enum(["owner", "admin", "editor", "coach"]).safeParse(role);
    if (!uuid.safeParse(userId).success || !r.success) return fail("Invalid request.");
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", r.data);
    if (error) return dbError("settings", error, "role");
    revalidatePath("/admin/settings");
    return okay();
  } catch (e) {
    return guardError("settings", e);
  }
}
