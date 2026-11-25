export type PublishStatus = "draft" | "published" | "archived";

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  event_type: string;
  summary: string | null;
  description: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  time_zone: string;
  venue_name: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  region: string | null;
  eligible_age_min: number | null;
  eligible_age_max: number | null;
  eligible_grades: number[];
  eligible_grad_years: number[];
  eligibility_notes: string | null;
  price_cents: number | null;
  price_note: string | null;
  capacity: number | null;
  registration_status: string;
  itinerary: { time?: string; title: string; description?: string }[];
  faqs: { question: string; answer: string }[];
  hero_image_path: string | null;
  card_image_path: string | null;
  gallery: { path: string; alt?: string }[];
  jotform_form_id: string | null;
  jotform_url: string | null;
  featured: boolean;
  status: PublishStatus;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

export type EventStaffRow = { id: string; event_id: string; name: string; role_title: string | null; bio: string | null; image_path: string | null; sort_order: number };

export type SponsorRow = {
  id: string;
  name: string;
  slug: string;
  website_url: string | null;
  description: string | null;
  tier: string;
  category: string | null;
  logo_path: string | null;
  featured: boolean;
  active: boolean;
  sort_order: number;
};

export type AthleteRow = {
  id: string;
  slug: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  profile_image_path: string | null;
  graduation_year: number | null;
  current_grade: number | null;
  primary_position: string | null;
  secondary_position: string | null;
  team: string | null;
  school_public: string | null;
  town: string | null;
  state: string | null;
  region: string | null;
  height_in: number | null;
  weight_lb: number | null;
  highlight_urls: string[];
  awards: string[];
  achievements: string[];
  bio: string | null;
  profile_status: "draft" | "pending_review" | "approved" | "rejected" | "archived";
  featured: boolean;
  featured_rank: number | null;
  consent_status: "none" | "pending" | "granted" | "withdrawn" | "declined";
  public_visibility: boolean;
  approved_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TestTypeRow = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  direction: "lower_is_better" | "higher_is_better";
  min_value: number;
  max_value: number;
  decimals: number;
  protocol_note: string | null;
  is_builtin: boolean;
  active: boolean;
  sort_order: number;
};

export type CombineResultRow = {
  id: string;
  athlete_id: string;
  event_id: string;
  test_type_id: string;
  value: number;
  unit: string;
  attempt_number: number;
  protocol: string;
  tested_on: string | null;
  verification_status: "unverified" | "verified" | "rejected";
  verified_at: string | null;
  is_current: boolean;
  source: string;
  notes: string | null;
  created_at: string;
};

export type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  cover_image_path: string | null;
  body_html: string;
  author_name: string | null;
  category: string;
  featured: boolean;
  status: PublishStatus;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

export type RankingRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  criteria: string;
  graduation_year: number | null;
  position: string | null;
  region: string | null;
  status: PublishStatus;
  published_at: string | null;
  approved_at: string | null;
};

export type HomepageSettings = {
  hero: {
    enabled: boolean;
    headline: string;
    subhead: string;
    tagline: string;
    primary_cta_label: string;
    primary_cta_href: string;
    secondary_cta_label: string;
    secondary_cta_href: string;
    background_image_path: string | null;
  };
  events: SectionSetting;
  athletes: SectionSetting;
  leaderboards: SectionSetting;
  news: SectionSetting;
  membership: SectionSetting;
  sponsors: SectionSetting;
};
export type SectionSetting = { enabled: boolean; title: string; description: string };

export type MembershipSettings = {
  name: string;
  price_cents: number;
  interval: string;
  billing_enabled: boolean;
  available_benefits: string[];
  planned_benefits: string[];
};

export type ContactSettings = {
  email: string | null;
  phone: string | null;
  address: string | null;
  social: Record<"instagram" | "x" | "youtube" | "facebook" | "tiktok", string | null>;
};

export type SponsorPackages = {
  event_sponsor_min_cents: number;
  event_sponsor_max_label: string;
  annual_partner_label: string;
  notes: string;
};
