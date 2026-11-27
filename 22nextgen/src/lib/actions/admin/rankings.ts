"use server";

import { assertCapability } from "@/lib/auth";
import { rankingSchema } from "@/lib/validation/admin";
import { fieldErrorsFrom } from "@/lib/validation/public";
import { fail, okData, okay, type ActionResult } from "@/lib/actions/result";
import { revalidatePublic } from "./revalidate";
import { dbError, guardError } from "./common";

export async function saveRanking(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await assertCapability("rankings.manage");
    const parsed = rankingSchema.safeParse(input);
    if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
    const { entries, ...row } = parsed.data;
    const ids = entries.map((e) => e.athlete_id);
    if (new Set(ids).size !== ids.length) return fail("An athlete appears more than once.");

    let rankingId = id;
    let slug = row.slug;
    if (id) {
      const { error } = await supabase.from("rankings").update(row).eq("id", id);
      if (error) return dbError("rankings", error, "ranking");
    } else {
      const { data, error } = await supabase.from("rankings").insert({ ...row, status: "draft" }).select("id, slug").single();
      if (error) return dbError("rankings", error, "ranking");
      rankingId = data.id;
      slug = data.slug;
    }
    if (!rankingId) return fail("Could not save the ranking.");
    const del = await supabase.from("ranking_entries").delete().eq("ranking_id", rankingId);
    if (del.error) return dbError("rankings", del.error, "ranking");
    if (entries.length) {
      const { error } = await supabase.from("ranking_entries").insert(entries.map((e, i) => ({ ranking_id: rankingId, athlete_id: e.athlete_id, rank: i + 1, note: e.note || null })));
      if (error) return dbError("rankings", error, "ranking");
    }
    revalidatePublic("/rankings", `/rankings/${slug}`);
    return okData({ id: rankingId });
  } catch (e) {
    return guardError("rankings", e);
  }
}

export async function setRankingStatus(id: string, status: "draft" | "published" | "archived"): Promise<ActionResult> {
  try {
    const { supabase, user } = await assertCapability("rankings.manage");
    const { data: r } = await supabase.from("rankings").select("slug, criteria").eq("id", id).single();
    if (!r) return fail("Ranking not found.");
    const now = new Date().toISOString();
    const patch = status === "published" ? { status, approved_by: user.id, approved_at: now, published_at: now } : { status };
    if (status === "published") {
      const { count } = await supabase.from("ranking_entries").select("id", { count: "exact", head: true }).eq("ranking_id", id);
      if (!count) return fail("Add at least one athlete before publishing.");
    }
    const { error } = await supabase.from("rankings").update(patch).eq("id", id);
    if (error) return dbError("rankings", error, "ranking");
    revalidatePublic("/rankings", `/rankings/${r.slug}`);
    return okay();
  } catch (e) {
    return guardError("rankings", e);
  }
}

export async function deleteRanking(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("rankings.manage");
    const { error } = await supabase.from("rankings").delete().eq("id", id);
    if (error) return dbError("rankings", error, "ranking");
    revalidatePublic("/rankings");
    return okay();
  } catch (e) {
    return guardError("rankings", e);
  }
}
