"use server";

import { assertCapability } from "@/lib/auth";
import { athleteSchema, consentSchema } from "@/lib/validation/admin";
import { fieldErrorsFrom } from "@/lib/validation/public";
import { fail, okData, okay, type ActionResult } from "@/lib/actions/result";
import { revalidatePublic } from "./revalidate";
import { dbError, guardError } from "./common";

const PRIVATE_KEYS = ["birth_date", "school", "parent_name", "parent_email", "parent_phone", "internal_notes"] as const;

export async function saveAthlete(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await assertCapability("athletes.manage");
    const parsed = athleteSchema.safeParse(input);
    if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
    const v = parsed.data;
    const priv = Object.fromEntries(PRIVATE_KEYS.map((k) => [k, v[k]]));
    const pub = Object.fromEntries(Object.entries(v).filter(([k]) => !(PRIVATE_KEYS as readonly string[]).includes(k)));

    if (id) {
      // Private fields first: the publication guard re-checks age eligibility using birth_date / grade.
      const p = await supabase.from("athlete_private").upsert({ athlete_id: id, ...priv }, { onConflict: "athlete_id" });
      if (p.error) return dbError("athletes", p.error, "athlete");
      const { data, error } = await supabase.from("athletes").update(pub).eq("id", id).select("slug").single();
      if (error) return dbError("athletes", error, "athlete");
      revalidatePublic("/athletes", `/athletes/${data.slug}`, "/combine-results");
      return okData({ id });
    }
    const { data, error } = await supabase.from("athletes").insert({ ...pub, profile_status: "draft", public_visibility: false }).select("id").single();
    if (error) return dbError("athletes", error, "athlete");
    const p = await supabase.from("athlete_private").insert({ athlete_id: data.id, ...priv });
    if (p.error) return dbError("athletes", p.error, "athlete");
    return okData({ id: data.id });
  } catch (e) {
    return guardError("athletes", e);
  }
}

export async function recordConsent(input: unknown): Promise<ActionResult> {
  try {
    const { supabase, user } = await assertCapability("athletes.manage");
    const parsed = consentSchema.safeParse(input);
    if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
    const v = parsed.data;
    const { error } = await supabase.from("athlete_consents").insert({
      athlete_id: v.athlete_id,
      status: v.status,
      guardian_name: v.guardian_name,
      guardian_relationship: v.guardian_relationship,
      method: v.method ?? null,
      verifiable_parental_consent: v.verifiable_parental_consent,
      evidence_note: v.evidence_note,
      recorded_by: user.id,
    });
    if (error) return dbError("athletes", error, "consent record");
    const { data: a } = await supabase.from("athletes").select("slug").eq("id", v.athlete_id).single();
    revalidatePublic("/athletes", a ? `/athletes/${a.slug}` : "/athletes", "/combine-results");
    return okay();
  } catch (e) {
    return guardError("athletes", e);
  }
}

export type AthleteTransition = "approve" | "unpublish" | "reject" | "submit_review" | "archive" | "restore";

const TRANSITIONS: Record<AthleteTransition, Record<string, unknown>> = {
  approve: { profile_status: "approved", public_visibility: true },
  unpublish: { public_visibility: false },
  reject: { profile_status: "rejected" },
  submit_review: { profile_status: "pending_review" },
  archive: { profile_status: "archived", archived_at: new Date().toISOString() },
  restore: { profile_status: "draft", archived_at: null },
};

export async function transitionAthlete(id: string, transition: AthleteTransition): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("athletes.manage");
    if (!(transition in TRANSITIONS)) return fail("Unknown action.");
    const patch = transition === "archive" ? { ...TRANSITIONS.archive, archived_at: new Date().toISOString() } : TRANSITIONS[transition];
    const { data, error } = await supabase.from("athletes").update(patch).eq("id", id).select("slug").single();
    if (error) return dbError("athletes", error, "athlete");
    revalidatePublic("/athletes", `/athletes/${data.slug}`, "/combine-results", "/rankings");
    return okay();
  } catch (e) {
    return guardError("athletes", e);
  }
}

export async function setAthleteFeatured(id: string, featured: boolean, rank?: number | null): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("athletes.manage");
    const { data: a } = await supabase.from("athletes").select("public_visibility, slug").eq("id", id).single();
    if (!a) return fail("Athlete not found.");
    if (featured && !a.public_visibility) return fail("Only approved, public athletes can be featured.");
    const { error } = await supabase.from("athletes").update({ featured, featured_rank: featured ? (rank ?? 100) : null }).eq("id", id);
    if (error) return dbError("athletes", error, "athlete");
    revalidatePublic("/athletes", `/athletes/${a.slug}`);
    return okay();
  } catch (e) {
    return guardError("athletes", e);
  }
}

/** Permanent erasure (privacy requests): private data, consents, results and ranking entries are removed. */
export async function deleteAthlete(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("athletes.manage");
    const { data, error } = await supabase.rpc("erase_athlete", { p_athlete: id });
    if (error) return dbError("athletes", error, "athlete");
    if (typeof data === "string" && data && !data.startsWith("http")) {
      await supabase.storage.from("public-media").remove([data]);
    }
    revalidatePublic("/athletes", "/combine-results", "/rankings");
    return okay();
  } catch (e) {
    return guardError("athletes", e);
  }
}
