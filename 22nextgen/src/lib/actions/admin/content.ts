"use server";

import { assertCapability } from "@/lib/auth";
import { siteContentSchema } from "@/lib/validation/content";
import { fieldErrorsFrom } from "@/lib/validation/public";
import { fail, okay, type ActionResult } from "@/lib/actions/result";
import { revalidatePublic } from "./revalidate";
import { dbError, guardError } from "./common";

export async function saveSiteContent(input: unknown): Promise<ActionResult> {
  try {
    const { supabase, user } = await assertCapability("content.manage");
    const parsed = siteContentSchema.safeParse(input);
    if (!parsed.success) return fail("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
    const v = parsed.data;
    const { membership_section, membership, contact, sponsor_packages, ...homepageSections } = v;
    const now = new Date().toISOString();
    const rows = [
      { key: "homepage", value: { ...homepageSections, membership: membership_section } },
      {
        key: "membership",
        value: {
          name: membership.name || "NEXT GEN+",
          price_cents: Math.round(Number(membership.price_dollars || "19.99") * 100),
          interval: membership.interval,
          billing_enabled: false,
          available_benefits: membership.available_benefits,
          planned_benefits: membership.planned_benefits,
        },
      },
      { key: "contact", value: { email: contact.email, phone: contact.phone, address: contact.address, social: { instagram: contact.instagram, x: contact.x, youtube: contact.youtube, facebook: contact.facebook, tiktok: contact.tiktok } } },
      {
        key: "sponsor_packages",
        value: {
          event_sponsor_min_cents: Math.round(Number(sponsor_packages.min_dollars || "150") * 100),
          event_sponsor_max_label: sponsor_packages.max_label,
          annual_partner_label: sponsor_packages.annual_partner_label,
          notes: sponsor_packages.notes,
        },
      },
    ].map((r) => ({ ...r, is_public: true, updated_by: user.id, updated_at: now }));
    const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
    if (error) return dbError("content", error, "setting");
    revalidatePublic("/", "/membership", "/partners", "/contact", "/about");
    return okay();
  } catch (e) {
    return guardError("content", e);
  }
}
