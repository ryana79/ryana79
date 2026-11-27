import { requireCapability } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/ui";
import { ContentForm } from "@/components/admin/content-form";
import { DEFAULT_CONTACT, DEFAULT_MEMBERSHIP, DEFAULT_SPONSOR_PACKAGES, mergeHomepage } from "@/lib/data/settings";
import type { ContactSettings, MembershipSettings, SponsorPackages } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  await requireCapability("content.manage");
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("key, value").in("key", ["homepage", "membership", "contact", "sponsor_packages"]);
  const by = Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Record<string, unknown>;
  const hp = mergeHomepage(by.homepage);
  const m = { ...DEFAULT_MEMBERSHIP, ...((by.membership as Partial<MembershipSettings>) ?? {}) };
  const c = { ...DEFAULT_CONTACT, ...((by.contact as Partial<ContactSettings>) ?? {}) };
  const social = { ...DEFAULT_CONTACT.social, ...(c.social ?? {}) };
  const sp = { ...DEFAULT_SPONSOR_PACKAGES, ...((by.sponsor_packages as Partial<SponsorPackages>) ?? {}) };
  return (
    <div>
      <AdminPageHeader title="Site content" description="Edit homepage copy, section visibility, membership promo, contact details and sponsor packages. No code changes required." />
      <ContentForm
        initial={{
          hero: { ...hp.hero, background_image_path: hp.hero.background_image_path ?? "" },
          event_promo: hp.event_promo, events: hp.events, athletes: hp.athletes, leaderboards: hp.leaderboards, news: hp.news, membership_section: hp.membership, sponsors: hp.sponsors,
          membership: { name: m.name, price_dollars: (m.price_cents / 100).toFixed(2), interval: m.interval as "month", available_benefits: m.available_benefits.join("\n"), planned_benefits: m.planned_benefits.join("\n") },
          contact: { email: c.email ?? "", phone: c.phone ?? "", address: c.address ?? "", instagram: social.instagram ?? "", x: social.x ?? "", youtube: social.youtube ?? "", facebook: social.facebook ?? "", tiktok: social.tiktok ?? "" },
          sponsor_packages: { min_dollars: String(Math.round(sp.event_sponsor_min_cents / 100)), max_label: sp.event_sponsor_max_label, annual_partner_label: sp.annual_partner_label, notes: sp.notes },
        }}
      />
    </div>
  );
}
