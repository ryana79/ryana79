"use server";

import { assertCapability, ForbiddenError } from "@/lib/auth";
import { eventSchema } from "@/lib/validation/admin";
import { fieldErrorsFrom } from "@/lib/validation/public";
import { eventToRow } from "@/lib/events/mapper";
import { fail, okData, okay, type ActionResult } from "@/lib/actions/result";
import { revalidatePublic } from "./revalidate";

function guardError(e: unknown) {
  if (e instanceof ForbiddenError) return fail(e.message);
  console.error("[admin/events]", e instanceof Error ? e.message : "unknown");
  return fail("Something went wrong. Please try again.");
}

export async function saveEvent(id: string | null, input: unknown, intent: "save" | "publish" = "save"): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await assertCapability("events.manage");
    const parsed = eventSchema.safeParse(input);
    if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
    const v = parsed.data;
    const row: Record<string, unknown> = eventToRow(v);
    if (intent === "publish") {
      if (!v.event_date) return fail("A date is required to publish.", { event_date: ["A date is required to publish."] });
      row.status = "published";
    }

    let eventId = id;
    if (id) {
      const { error } = await supabase.from("events").update(row).eq("id", id);
      if (error) return dbError(error);
    } else {
      const { data, error } = await supabase.from("events").insert(row).select("id").single();
      if (error) return dbError(error);
      eventId = data.id;
    }
    if (!eventId) return fail("Could not save the event.");

    const staffDel = await supabase.from("event_staff").delete().eq("event_id", eventId);
    if (staffDel.error) return dbError(staffDel.error);
    if (v.staff.length) {
      const { error } = await supabase.from("event_staff").insert(v.staff.map((s, i) => ({ event_id: eventId, name: s.name, role_title: s.role_title || null, bio: s.bio || null, image_path: s.image_path || null, sort_order: (i + 1) * 10 })));
      if (error) return dbError(error);
    }
    const spDel = await supabase.from("event_sponsors").delete().eq("event_id", eventId);
    if (spDel.error) return dbError(spDel.error);
    if (v.sponsor_ids.length) {
      const { error } = await supabase.from("event_sponsors").insert(v.sponsor_ids.map((sid) => ({ event_id: eventId, sponsor_id: sid })));
      if (error) return dbError(error);
    }
    revalidatePublic("/events", `/events/${v.slug}`);
    return okData({ id: eventId });
  } catch (e) {
    return guardError(e);
  }
}

function dbError(error: { code?: string; message: string }) {
  if (error.code === "23505") return fail("That slug is already used by another event.", { slug: ["That slug is already in use."] });
  if (error.code === "42501") return fail("You do not have permission to do that.");
  console.error("[admin/events] db error", error.code);
  return fail("The database rejected this change. Please review the fields and try again.");
}

export async function setEventStatus(id: string, status: "draft" | "published" | "archived"): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("events.manage");
    const { data: existing } = await supabase.from("events").select("slug, event_date").eq("id", id).single();
    if (!existing) return fail("Event not found.");
    if (status === "published" && !existing.event_date) return fail("Set a date before publishing.");
    const { error } = await supabase.from("events").update({ status, ...(status !== "archived" ? { archived_at: null } : {}) }).eq("id", id);
    if (error) return dbError(error);
    revalidatePublic("/events", `/events/${existing.slug}`);
    return okay();
  } catch (e) {
    return guardError(e);
  }
}

/** Hard delete is only possible for events with no registrations, participation or results (FK restrict); otherwise archive. */
export async function deleteEvent(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await assertCapability("athletes.manage");
    void user;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") return fail("This event has registrations, participation or results tied to it. Archive it instead to preserve history.");
      return dbError(error);
    }
    revalidatePublic("/events");
    return okay();
  } catch (e) {
    return guardError(e);
  }
}
