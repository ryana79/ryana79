"use server";

import { assertCapability } from "@/lib/auth";
import { sponsorSchema } from "@/lib/validation/admin";
import { fieldErrorsFrom } from "@/lib/validation/public";
import { fail, okData, okay, type ActionResult } from "@/lib/actions/result";
import { slugify } from "@/lib/format";
import { revalidatePublic } from "./revalidate";
import { dbError, guardError } from "./common";

export async function saveSponsor(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await assertCapability("sponsors.manage");
    const parsed = sponsorSchema.safeParse(input);
    if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
    const v = parsed.data;
    if (id) {
      const { error } = await supabase.from("sponsors").update(v).eq("id", id);
      if (error) return dbError("sponsors", error, "sponsor");
      revalidatePublic("/partners");
      return okData({ id });
    }
    const base = slugify(v.name) || "sponsor";
    for (let i = 0; i < 5; i++) {
      const slug = i === 0 ? base : `${base}-${i + 1}`;
      const { data, error } = await supabase.from("sponsors").insert({ ...v, slug }).select("id").single();
      if (!error) {
        revalidatePublic("/partners");
        return okData({ id: data.id });
      }
      if (error.code !== "23505") return dbError("sponsors", error, "sponsor");
    }
    return fail("Could not generate a unique slug for this sponsor.");
  } catch (e) {
    return guardError("sponsors", e);
  }
}

export async function setSponsorActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("sponsors.manage");
    const { error } = await supabase.from("sponsors").update({ active }).eq("id", id);
    if (error) return dbError("sponsors", error, "sponsor");
    revalidatePublic("/partners");
    return okay();
  } catch (e) {
    return guardError("sponsors", e);
  }
}

export async function deleteSponsor(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await assertCapability("sponsors.manage");
    const { error } = await supabase.from("sponsors").delete().eq("id", id);
    if (error) return dbError("sponsors", error, "sponsor");
    revalidatePublic("/partners");
    return okay();
  } catch (e) {
    return guardError("sponsors", e);
  }
}
