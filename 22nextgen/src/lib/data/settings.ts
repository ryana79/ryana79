import { createPublicClient } from "@/lib/supabase/public";
import type { ContactSettings, HomepageSettings, MembershipSettings, SponsorPackages } from "@/lib/types";

export const DEFAULT_HOMEPAGE: HomepageSettings = {
  hero: {
    enabled: true,
    headline: "22 NEXT GEN",
    subhead: "THE FUTURE STARTS HERE.",
    tagline: "Compete. Develop. Get Discovered.",
    primary_cta_label: "Explore Events",
    primary_cta_href: "/events",
    secondary_cta_label: "Create Athlete Profile",
    secondary_cta_href: "/register",
    background_image_path: null,
  },
  events: { enabled: true, title: "Upcoming Events", description: "Combines, showcases and development camps across the Northeast." },
  athletes: { enabled: true, title: "Featured Athletes", description: "Approved public profiles with verified performance metrics." },
  leaderboards: { enabled: true, title: "Performance Leaderboards", description: "Verified combine results only." },
  news: { enabled: true, title: "Latest from 22 NEXT GEN", description: "Spotlights, recaps, announcements and development." },
  membership: { enabled: true, title: "NEXT GEN+", description: "Expanded profiles, performance tracking and player cards for serious athletes." },
  sponsors: { enabled: true, title: "Partners", description: "Brands backing the next generation." },
};

export const DEFAULT_MEMBERSHIP: MembershipSettings = {
  name: "NEXT GEN+",
  price_cents: 1999,
  interval: "month",
  billing_enabled: false,
  available_benefits: [],
  planned_benefits: [],
};

export const DEFAULT_CONTACT: ContactSettings = {
  email: null,
  phone: null,
  address: null,
  social: { instagram: null, x: null, youtube: null, facebook: null, tiktok: null },
};

export const DEFAULT_SPONSOR_PACKAGES: SponsorPackages = {
  event_sponsor_min_cents: 15000,
  event_sponsor_max_label: "$2,500+",
  annual_partner_label: "Custom",
  notes: "",
};

export function mergeHomepage(value: unknown): HomepageSettings {
  const v = (value ?? {}) as Partial<HomepageSettings>;
  const out = { ...DEFAULT_HOMEPAGE } as HomepageSettings;
  for (const key of Object.keys(DEFAULT_HOMEPAGE) as (keyof HomepageSettings)[]) {
    (out as Record<string, unknown>)[key] = { ...DEFAULT_HOMEPAGE[key], ...((v[key] as object) ?? {}) };
  }
  return out;
}

/** Reads public site settings; falls back to defaults when the database is unavailable. */
export async function getPublicSettings() {
  const supabase = createPublicClient();
  const fallback = {
    homepage: DEFAULT_HOMEPAGE,
    membership: DEFAULT_MEMBERSHIP,
    contact: DEFAULT_CONTACT,
    sponsorPackages: DEFAULT_SPONSOR_PACKAGES,
    available: false,
  };
  if (!supabase) return fallback;
  const { data, error } = await supabase.from("site_settings").select("key, value").eq("is_public", true);
  if (error || !data) return fallback;
  const byKey = Object.fromEntries(data.map((r) => [r.key, r.value]));
  return {
    homepage: mergeHomepage(byKey.homepage),
    membership: { ...DEFAULT_MEMBERSHIP, ...(byKey.membership ?? {}) } as MembershipSettings,
    contact: {
      ...DEFAULT_CONTACT,
      ...(byKey.contact ?? {}),
      social: { ...DEFAULT_CONTACT.social, ...((byKey.contact as ContactSettings | undefined)?.social ?? {}) },
    } as ContactSettings,
    sponsorPackages: { ...DEFAULT_SPONSOR_PACKAGES, ...(byKey.sponsor_packages ?? {}) } as SponsorPackages,
    available: true,
  };
}
