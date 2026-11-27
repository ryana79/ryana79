"use server";

import { assertCapability } from "@/lib/auth";
import { guardError } from "@/lib/actions/admin/common";
import { fail, okData } from "@/lib/actions/result";
import { planLeadImport, planLeadMatch, TURKEY_BOWL_2026_SOURCE, TURKEY_BOWL_2026_TAG, type MappedLeadRow, type PlannedLeadRow } from "@/lib/leads/import";

const MAX_ROWS = 5000;

function cleanRows(input: unknown): MappedLeadRow[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_ROWS) return null;
  const rows: MappedLeadRow[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const line = Number(row.line);
    if (!Number.isInteger(line) || line < 2 || line > MAX_ROWS + 1) return null;
    rows.push({
      line,
      name: String(row.name ?? "").slice(0, 160),
      email: String(row.email ?? "").slice(0, 254),
      town: String(row.town ?? "").slice(0, 120),
      grade: String(row.grade ?? "").slice(0, 80),
      permission: String(row.permission ?? "").slice(0, 200),
    });
  }
  return rows;
}

async function existingEmails(supabase: Awaited<ReturnType<typeof assertCapability>>["supabase"], emails: string[]) {
  const found = new Set<string>();
  for (let i = 0; i < emails.length; i += 200) {
    const chunk = emails.slice(i, i + 200);
    const { data, error } = await supabase.from("event_leads").select("email").in("email", chunk);
    if (error) throw error;
    for (const row of data ?? []) found.add(row.email);
  }
  return found;
}

export async function previewTurkeyBowlImport(input: unknown) {
  try {
    const { supabase } = await assertCapability("registrations.view");
    const rows = cleanRows(input);
    if (!rows) return fail("Upload a CSV with a header row and at least one contact.");
    const emails = rows.map((row) => row.email.trim().toLowerCase()).filter(Boolean);
    const plan = planLeadImport(rows, await existingEmails(supabase, emails));
    return okData(summarize(plan));
  } catch (error) {
    return guardError("leads-preview", error);
  }
}

export async function applyTurkeyBowlImport(input: unknown) {
  try {
    const { supabase, user } = await assertCapability("registrations.view");
    const rows = cleanRows(input);
    if (!rows) return fail("That import could not be read. Upload the file again.");
    const emails = rows.map((row) => row.email.trim().toLowerCase()).filter(Boolean);
    const plan = planLeadImport(rows, await existingEmails(supabase, emails));
    let created = 0;
    let matched = 0;
    const now = new Date().toISOString();
    for (const row of plan) {
      if (row.status === "skipped" || !row.email || !row.name) continue;
      const { data: existing, error: readError } = await supabase.from("event_leads").select("id, parent_name, town, grade_band, marketing_permission, news_opt_in, tags, source").eq("email", row.email).maybeSingle();
      if (readError) return fail("The import stopped before it finished. Run it again. Existing contacts were not duplicated.");
      if (!existing) {
        const { data: inserted, error } = await supabase.from("event_leads").insert({
          email: row.email,
          parent_name: row.name,
          town: row.town,
          grade_band: row.grade,
          source: TURKEY_BOWL_2026_SOURCE,
          marketing_permission: row.permission,
          marketing_permission_at: row.permission === "unknown" ? null : now,
          tags: [TURKEY_BOWL_2026_TAG],
        }).select("id").single();
        if (error || !inserted) return fail("The import stopped before it finished. Run it again. Existing contacts were not duplicated.");
        if (row.permission !== "unknown") {
          await supabase.from("event_lead_opt_ins").insert({ lead_id: inserted.id, kind: "marketing", value: row.permission, source: TURKEY_BOWL_2026_SOURCE, recorded_at: now });
        }
        created += 1;
        continue;
      }
      const patch = planLeadMatch({
        parent_name: existing.parent_name,
        town: existing.town,
        grade_band: existing.grade_band,
        marketing_permission: existing.marketing_permission,
        news_opt_in: existing.news_opt_in,
        tags: existing.tags ?? [],
        source: existing.source,
      }, { town: row.town, grade: row.grade, permission: row.permission });
      const update: { tags: string[]; town?: string; grade_band?: string; marketing_permission?: string; marketing_permission_at?: string } = { tags: patch.tags };
      if (patch.town) update.town = patch.town;
      if (patch.grade_band) update.grade_band = patch.grade_band;
      if (patch.marketing_permission) {
        update.marketing_permission = patch.marketing_permission;
        update.marketing_permission_at = now;
      }
      const { error } = await supabase.from("event_leads").update(update).eq("id", existing.id);
      if (error) return fail("The import stopped before it finished. Run it again. Existing contacts were not duplicated.");
      if (patch.recordPermission && patch.marketing_permission) {
        await supabase.from("event_lead_opt_ins").insert({ lead_id: existing.id, kind: "marketing", value: patch.marketing_permission, source: TURKEY_BOWL_2026_SOURCE, recorded_at: now });
      }
      matched += 1;
    }
    await supabase.rpc("write_audit", { p_action: "import", p_entity_type: "event_leads", p_entity_id: "turkey-bowl-2026", p_summary: `Imported Turkey Bowl 2026 contacts: ${created} created, ${matched} matched`, p_metadata: { created, matched, actor: user.id } });
    return okData({ created, matched });
  } catch (error) {
    return guardError("leads-import", error);
  }
}

function summarize(plan: PlannedLeadRow[]) {
  return {
    rows: plan,
    valid: plan.filter((row) => row.status === "valid").length,
    duplicates: plan.filter((row) => row.status === "duplicate").length,
    skipped: plan.filter((row) => row.status === "skipped").length,
  };
}
