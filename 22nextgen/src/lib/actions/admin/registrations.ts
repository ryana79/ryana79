"use server";

import { z } from "zod";
import { assertCapability } from "@/lib/auth";
import { fail, okData, okay, type ActionResult } from "@/lib/actions/result";
import { revalidatePublic } from "./revalidate";
import { dbError, guardError } from "./common";

const uuid = z.string().uuid();

export async function linkRegistration(regId: string, athleteId: string): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("registrations.view");
    if (!uuid.safeParse(regId).success || !uuid.safeParse(athleteId).success) return fail("Invalid request.");
    const { data: reg } = await supabase.from("event_registrations").select("event_id").eq("id", regId).single();
    if (!reg) return fail("Registration not found.");
    const { data: athlete } = await supabase.from("athletes").select("id").eq("id", athleteId).maybeSingle();
    if (!athlete) return fail("Athlete not found.");
    const { error } = await supabase.from("event_registrations").update({ athlete_id: athleteId, review_status: "linked" }).eq("id", regId);
    if (error) return dbError("registrations", error, "registration");
    await supabase.from("event_participation").upsert({ event_id: reg.event_id, athlete_id: athleteId, status: "registered", source: "jotform" }, { onConflict: "event_id,athlete_id", ignoreDuplicates: true });
    revalidatePublic();
    return okay();
  } catch (e) {
    return guardError("registrations", e);
  }
}

export async function createAthleteFromRegistration(regId: string): Promise<ActionResult<{ athleteId: string }>> {
  try {
    const { supabase } = await assertCapability("registrations.view");
    if (!uuid.safeParse(regId).success) return fail("Invalid request.");
    const { data: reg } = await supabase.from("event_registrations").select("*").eq("id", regId).single();
    if (!reg) return fail("Registration not found.");
    if (reg.athlete_id) return fail("This registration is already linked to an athlete.");
    if (!reg.participant_first_name || !reg.participant_last_name) return fail("The registration has no participant name. Link it to an existing athlete instead.");
    const { data: athlete, error } = await supabase
      .from("athletes")
      .insert({ first_name: reg.participant_first_name, last_name: reg.participant_last_name, graduation_year: reg.graduation_year, current_grade: reg.grade, primary_position: reg.position && ["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "CB", "S", "K/P", "ATH"].includes(reg.position.toUpperCase()) ? reg.position.toUpperCase() : null, team: reg.team, profile_status: "draft", public_visibility: false })
      .select("id")
      .single();
    if (error) return dbError("registrations", error, "athlete");
    const priv = await supabase.from("athlete_private").insert({ athlete_id: athlete.id, parent_name: reg.parent_name, parent_email: reg.parent_email, parent_phone: reg.parent_phone });
    if (priv.error) return dbError("registrations", priv.error, "athlete");
    const upd = await supabase.from("event_registrations").update({ athlete_id: athlete.id, review_status: "new_athlete" }).eq("id", regId);
    if (upd.error) return dbError("registrations", upd.error, "registration");
    await supabase.from("event_participation").upsert({ event_id: reg.event_id, athlete_id: athlete.id, status: "registered", source: "jotform" }, { onConflict: "event_id,athlete_id", ignoreDuplicates: true });
    return okData({ athleteId: athlete.id });
  } catch (e) {
    return guardError("registrations", e);
  }
}

export async function ignoreRegistration(regId: string): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("registrations.view");
    if (!uuid.safeParse(regId).success) return fail("Invalid request.");
    const { error } = await supabase.from("event_registrations").update({ review_status: "ignored" }).eq("id", regId);
    if (error) return dbError("registrations", error, "registration");
    return okay();
  } catch (e) {
    return guardError("registrations", e);
  }
}

export async function setRegistrationPayment(regId: string, status: string): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("registrations.view");
    const s = z.enum(["unverified", "verified", "unpaid", "refunded", "not_applicable"]).safeParse(status);
    if (!uuid.safeParse(regId).success || !s.success) return fail("Invalid request.");
    const { error } = await supabase.from("event_registrations").update({ payment_status: s.data }).eq("id", regId);
    if (error) return dbError("registrations", error, "registration");
    return okay();
  } catch (e) {
    return guardError("registrations", e);
  }
}

export async function setRegistrationStatus(regId: string, status: string): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("registrations.view");
    const s = z.enum(["received", "confirmed", "cancelled"]).safeParse(status);
    if (!uuid.safeParse(regId).success || !s.success) return fail("Invalid request.");
    const { error } = await supabase.from("event_registrations").update({ status: s.data }).eq("id", regId);
    if (error) return dbError("registrations", error, "registration");
    return okay();
  } catch (e) {
    return guardError("registrations", e);
  }
}
