"use server";

import { assertCapability } from "@/lib/auth";
import { resultSchema, testTypeSchema } from "@/lib/validation/admin";
import { fieldErrorsFrom } from "@/lib/validation/public";
import { validateCombineValue } from "@/lib/leaderboard";
import { parseMeasurement } from "@/lib/import/normalize";
import { fail, okData, okay, type ActionResult } from "@/lib/actions/result";
import { athleteName } from "@/lib/format";
import { revalidatePublic } from "./revalidate";
import { dbError, guardError } from "./common";

export async function searchAthletesForPicker(term: string): Promise<{ id: string; label: string; isPublic: boolean }[]> {
  try {
    const { supabase } = await assertCapability("results.enter");
    const t = term.replace(/[^\p{L}\p{N} '\-]/gu, "").trim().slice(0, 60);
    if (t.length < 2) return [];
    const { data } = await supabase.from("athletes").select("id, first_name, last_name, display_name, graduation_year, team, public_visibility").or(`first_name.ilike.%${t}%,last_name.ilike.%${t}%`).neq("profile_status", "archived").order("last_name").limit(10);
    return (data ?? []).map((a) => ({ isPublic: a.public_visibility, id: a.id, label: `${athleteName(a)}${a.graduation_year ? ` · ${a.graduation_year}` : ""}${a.team ? ` · ${a.team}` : ""}` }));
  } catch {
    return [];
  }
}

export async function addResult(input: unknown, verifyNow = false): Promise<ActionResult> {
  try {
    const { supabase, user } = await assertCapability("results.enter");
    const parsed = resultSchema.safeParse(input);
    if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
    const v = parsed.data;
    const { data: type } = await supabase.from("combine_test_types").select("id, name, unit, min_value, max_value, active").eq("id", v.test_type_id).single();
    if (!type || !type.active) return fail("Unknown or inactive test.");
    const num = parseMeasurement(v.value, type.unit);
    const check = validateCombineValue(num, { min: Number(type.min_value), max: Number(type.max_value), name: type.name, unit: type.unit });
    if (!check.ok) return fail(check.error, { value: [check.error] });
    const row: Record<string, unknown> = {
      athlete_id: v.athlete_id, event_id: v.event_id, test_type_id: v.test_type_id, value: check.value, unit: type.unit,
      attempt_number: v.attempt_number, protocol: v.protocol, tested_on: v.tested_on, notes: v.notes, source: "manual", created_by: user.id,
    };
    if (verifyNow) row.verification_status = "verified";
    const { error } = await supabase.from("combine_results").insert(row);
    if (error) {
      if (error.code === "23505") return fail("A result already exists for this athlete, test, attempt and protocol at this event. Use Correct on the existing result.");
      return dbError("results", error, "result");
    }
    await supabase.from("event_participation").upsert({ event_id: v.event_id, athlete_id: v.athlete_id, status: "attended", source: "manual" }, { onConflict: "event_id,athlete_id", ignoreDuplicates: true });
    revalidatePublic("/combine-results");
    return okay();
  } catch (e) {
    return guardError("results", e);
  }
}

export async function setResultVerification(id: string, status: "verified" | "unverified" | "rejected"): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("results.verify");
    const { error } = await supabase.from("combine_results").update({ verification_status: status }).eq("id", id).eq("is_current", true);
    if (error) return dbError("results", error, "result");
    revalidatePublic("/combine-results", "/athletes");
    return okay();
  } catch (e) {
    return guardError("results", e);
  }
}

export async function verifyEventResults(eventId: string): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("results.verify");
    if (!/^[0-9a-f-]{36}$/i.test(eventId)) return fail("Choose an event.");
    const { error } = await supabase.from("combine_results").update({ verification_status: "verified" }).eq("event_id", eventId).eq("is_current", true).eq("verification_status", "unverified");
    if (error) return dbError("results", error, "result");
    revalidatePublic("/combine-results", "/athletes");
    return okay();
  } catch (e) {
    return guardError("results", e);
  }
}

export async function correctResult(id: string, rawValue: string, notes: string): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("results.enter");
    const { data: old } = await supabase.from("combine_results").select("test_type_id").eq("id", id).single();
    if (!old) return fail("Result not found.");
    const { data: type } = await supabase.from("combine_test_types").select("name, unit, min_value, max_value").eq("id", old.test_type_id).single();
    if (!type) return fail("Test not found.");
    const check = validateCombineValue(parseMeasurement(rawValue, type.unit), { min: Number(type.min_value), max: Number(type.max_value), name: type.name, unit: type.unit });
    if (!check.ok) return fail(check.error);
    const { error } = await supabase.rpc("correct_combine_result", { p_id: id, p_value: check.value, p_notes: notes.trim().slice(0, 500) || null });
    if (error) return dbError("results", error, "result");
    revalidatePublic("/combine-results", "/athletes");
    return okay();
  } catch (e) {
    return guardError("results", e);
  }
}

export async function saveTestType(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await assertCapability("results.verify");
    const parsed = testTypeSchema.safeParse(input);
    if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
    const v = parsed.data;
    if (v.max_value === null || v.max_value <= v.min_value) return fail("Maximum must be greater than minimum.", { max_value: ["Maximum must be greater than minimum."] });
    if (id) {
      const { slug: _slug, ...rest } = v;
      void _slug;
      const { error } = await supabase.from("combine_test_types").update(rest).eq("id", id);
      if (error) return dbError("results", error, "test");
      revalidatePublic("/combine-results");
      return okData({ id });
    }
    const { data, error } = await supabase.from("combine_test_types").insert({ ...v, is_builtin: false }).select("id").single();
    if (error) return dbError("results", error, "test");
    revalidatePublic("/combine-results");
    return okData({ id: data.id });
  } catch (e) {
    return guardError("results", e);
  }
}

export async function setTestTypeActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("results.verify");
    const { error } = await supabase.from("combine_test_types").update({ active }).eq("id", id);
    if (error) return dbError("results", error, "test");
    revalidatePublic("/combine-results");
    return okay();
  } catch (e) {
    return guardError("results", e);
  }
}
