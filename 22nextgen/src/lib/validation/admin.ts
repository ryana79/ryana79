import { z } from "zod";
import { ARTICLE_CATEGORIES, EVENT_TYPES, POSITIONS, REGISTRATION_STATUSES, SPONSOR_TIERS, US_STATES } from "@/lib/site";
import { parseJotformInput } from "@/lib/jotform";

const str = (max = 500) => z.string().trim().max(max).optional().default("").transform((v) => v || null);
const req = (max: number, label: string) => z.string().trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);

export const intField = (min: number, max: number, label: string) =>
  z.string().trim().optional().default("").transform((v, ctx): number | null => {
    if (v === "") return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) {
      ctx.addIssue({ code: "custom", message: `${label} must be a whole number between ${min} and ${max}.` });
      return z.NEVER;
    }
    return n;
  });

export const numField = (min: number, max: number, label: string) =>
  z.string().trim().optional().default("").transform((v, ctx): number | null => {
    if (v === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) {
      ctx.addIssue({ code: "custom", message: `${label} must be between ${min} and ${max}.` });
      return z.NEVER;
    }
    return n;
  });

const dateField = (label: string, required = false) =>
  z.string().trim().optional().default("").transform((v, ctx): string | null => {
    if (!v) {
      if (required) ctx.addIssue({ code: "custom", message: `${label} is required.` });
      return null;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) {
      ctx.addIssue({ code: "custom", message: `${label} must be a valid date.` });
      return z.NEVER;
    }
    return v;
  });

const timeField = z.string().trim().optional().default("").transform((v, ctx): string | null => {
  if (!v) return null;
  if (!/^\d{2}:\d{2}$/.test(v)) {
    ctx.addIssue({ code: "custom", message: "Use a valid time." });
    return z.NEVER;
  }
  return v;
});

const slugField = z.string().trim().min(1, "Slug is required.").max(90).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only.");
const imagePath = z.string().trim().max(300).optional().default("").transform((v) => v || null);
const lines = (max: number) =>
  z.string().optional().default("").transform((v) => v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, max));

export const dollarsToCents = z.string().trim().optional().default("").transform((v, ctx): number | null => {
  if (v === "") return null;
  const cleaned = v.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    ctx.addIssue({ code: "custom", message: "Enter a dollar amount like 75 or 19.99." });
    return z.NEVER;
  }
  return Math.round(Number(cleaned) * 100);
});

// ----------------------------------------------------------------- events
export const eventSchema = z
  .object({
    title: req(200, "Title"),
    slug: slugField,
    event_type: z.enum(EVENT_TYPES.map((t) => t.value) as [string, ...string[]]),
    summary: str(500),
    description: z.string().max(60000).optional().default(""),
    event_date: dateField("Date"),
    start_time: timeField,
    end_time: timeField,
    time_zone: z.string().trim().min(1).max(60).default("America/New_York"),
    venue_name: str(200),
    address_line: str(200),
    city: str(100),
    state: z.string().trim().optional().default("").refine((v) => v === "" || (US_STATES as readonly string[]).includes(v), "Pick a valid state.").transform((v) => v || null),
    postal_code: str(20),
    region: str(60),
    eligible_age_min: intField(4, 25, "Minimum age"),
    eligible_age_max: intField(4, 25, "Maximum age"),
    eligible_grades: z.array(z.string()).optional().default([]).transform((a) => a.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 12)),
    eligible_grad_years: z.string().optional().default("").transform((v) => [...new Set(v.split(/[,\s]+/).map(Number).filter((n) => Number.isInteger(n) && n >= 2025 && n <= 2045))].sort()),
    eligibility_notes: str(1000),
    price_dollars: dollarsToCents,
    price_note: str(200),
    capacity: intField(1, 100000, "Capacity"),
    registration_status: z.enum(REGISTRATION_STATUSES.map((s) => s.value) as [string, ...string[]]),
    itinerary: z.array(z.object({ time: z.string().trim().max(40).optional().default(""), title: z.string().trim().max(160), description: z.string().trim().max(600).optional().default("") })).optional().default([]).transform((a) => a.filter((r) => r.title)),
    faqs: z.array(z.object({ question: z.string().trim().max(300), answer: z.string().trim().max(2000) })).optional().default([]).transform((a) => a.filter((r) => r.question && r.answer)),
    hero_image_path: imagePath,
    card_image_path: imagePath,
    gallery: z.array(z.object({ path: z.string().trim().max(300), alt: z.string().trim().max(200).optional().default("") })).optional().default([]).transform((a) => a.filter((g) => g.path)),
    jotform_input: z.string().trim().max(500).optional().default(""),
    featured: z.boolean().optional().default(false),
    seo_title: str(70),
    seo_description: str(200),
    staff: z.array(z.object({ name: z.string().trim().max(120), role_title: z.string().trim().max(120).optional().default(""), bio: z.string().trim().max(600).optional().default(""), image_path: z.string().trim().max(300).optional().default("") })).optional().default([]).transform((a) => a.filter((s) => s.name)),
    sponsor_ids: z.array(z.string().uuid()).optional().default([]),
  })
  .superRefine((v, ctx) => {
    if (v.eligible_age_min !== null && v.eligible_age_max !== null && v.eligible_age_min > v.eligible_age_max) {
      ctx.addIssue({ code: "custom", path: ["eligible_age_max"], message: "Maximum age must be at least the minimum age." });
    }
    if (v.start_time && v.end_time && v.end_time <= v.start_time) {
      ctx.addIssue({ code: "custom", path: ["end_time"], message: "End time must be after start time." });
    }
    if (v.jotform_input) {
      const p = parseJotformInput(v.jotform_input);
      if (!p.ok) ctx.addIssue({ code: "custom", path: ["jotform_input"], message: p.error });
    }
  });
export type EventFormInput = z.input<typeof eventSchema>;
export type EventFormOutput = z.output<typeof eventSchema>;

// --------------------------------------------------------------- athletes
const position = z.string().trim().optional().default("").refine((v) => v === "" || (POSITIONS as readonly string[]).includes(v), "Pick a valid position.").transform((v) => v || null);

export const athleteSchema = z.object({
  first_name: req(80, "First name"),
  last_name: req(80, "Last name"),
  display_name: str(120),
  profile_image_path: imagePath,
  graduation_year: intField(2025, 2045, "Graduation year"),
  current_grade: intField(1, 12, "Grade"),
  primary_position: position,
  secondary_position: position,
  team: str(120),
  school_public: str(160),
  school: str(160),
  town: str(100),
  state: z.string().trim().optional().default("").refine((v) => v === "" || (US_STATES as readonly string[]).includes(v), "Pick a valid state.").transform((v) => v || null),
  region: str(60),
  height_in: numField(30, 96, "Height (inches)"),
  weight_lb: numField(30, 450, "Weight (lb)"),
  highlight_urls: lines(6).superRefine((urls, ctx) => {
    for (const u of urls) {
      try {
        if (new URL(u).protocol !== "https:") throw new Error();
      } catch {
        ctx.addIssue({ code: "custom", message: `"${u.slice(0, 40)}" is not a valid https link.` });
      }
    }
  }),
  awards: lines(20),
  achievements: lines(20),
  bio: z.string().trim().max(4000).optional().default("").transform((v) => v || null),
  featured_rank: intField(1, 999, "Featured order"),
  birth_date: dateField("Birth date"),
  parent_name: str(160),
  parent_email: z.string().trim().optional().default("").refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Enter a valid email.").transform((v) => v || null),
  parent_phone: str(40),
  internal_notes: str(4000),
});
export type AthleteFormInput = z.input<typeof athleteSchema>;
export type AthleteFormOutput = z.output<typeof athleteSchema>;

export const consentSchema = z.object({
  athlete_id: z.string().uuid(),
  status: z.enum(["granted", "withdrawn", "declined", "pending"]),
  guardian_name: str(160),
  guardian_relationship: str(80),
  method: z.enum(["signed_form", "email_confirmation", "electronic_signature", "other"]).optional(),
  verifiable_parental_consent: z.boolean().optional().default(false),
  evidence_note: str(2000),
}).superRefine((v, ctx) => {
  if (v.status === "granted" && !v.guardian_name) ctx.addIssue({ code: "custom", path: ["guardian_name"], message: "Guardian name is required to record consent." });
  if (v.status === "granted" && !v.method) ctx.addIssue({ code: "custom", path: ["method"], message: "Choose how consent was obtained." });
});

// ---------------------------------------------------------------- sponsors
export const sponsorSchema = z.object({
  name: req(160, "Name"),
  website_url: z.string().trim().optional().default("").refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Use a full http(s) link.").transform((v) => v || null),
  description: str(2000),
  tier: z.enum(SPONSOR_TIERS.map((t) => t.value) as [string, ...string[]]),
  category: str(80),
  logo_path: imagePath,
  featured: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
  sort_order: intField(0, 9999, "Sort order").transform((v) => v ?? 100),
});
export type SponsorFormInput = z.input<typeof sponsorSchema>;

// ------------------------------------------------------------------- news
export const articleSchema = z.object({
  title: req(200, "Title"),
  slug: slugField,
  summary: str(500),
  cover_image_path: imagePath,
  body_html: z.string().max(200000).optional().default(""),
  author_name: str(120),
  category: z.enum(ARTICLE_CATEGORIES.map((c) => c.value) as [string, ...string[]]),
  featured: z.boolean().optional().default(false),
  publish_at: z.string().trim().optional().default("").transform((v, ctx): string | null => {
    if (!v) return null;
    const t = Date.parse(v);
    if (Number.isNaN(t)) {
      ctx.addIssue({ code: "custom", message: "Enter a valid publish date." });
      return z.NEVER;
    }
    return new Date(t).toISOString();
  }),
  seo_title: str(70),
  seo_description: str(200),
});
export type ArticleFormInput = z.input<typeof articleSchema>;

// ---------------------------------------------------------------- rankings
export const rankingSchema = z.object({
  title: req(160, "Title"),
  slug: slugField,
  description: str(1000),
  criteria: z.string().trim().min(10, "Describe the ranking criteria (at least 10 characters).").max(3000),
  graduation_year: intField(2025, 2045, "Class"),
  position: position,
  region: str(60),
  entries: z.array(z.object({ athlete_id: z.string().uuid(), note: z.string().trim().max(300).optional().default("") })).default([]),
});
export type RankingFormInput = z.input<typeof rankingSchema>;

// ------------------------------------------------------------------ results
export const resultSchema = z.object({
  athlete_id: z.string().uuid("Choose an athlete."),
  event_id: z.string().uuid("Choose an event."),
  test_type_id: z.string().uuid("Choose a test."),
  value: z.string().trim().min(1, "Enter a result."),
  attempt_number: intField(1, 10, "Attempt").transform((v) => v ?? 1),
  protocol: z.string().trim().max(40).optional().default("standard").transform((v) => (v || "standard").toLowerCase().replace(/[^a-z0-9]+/g, "_")),
  tested_on: dateField("Test date"),
  notes: str(500),
});

export const testTypeSchema = z.object({
  name: req(80, "Name"),
  slug: z.string().trim().regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers and underscores."),
  unit: req(10, "Unit"),
  direction: z.enum(["lower_is_better", "higher_is_better"]),
  min_value: numField(0, 100000, "Minimum").transform((v) => v ?? 0),
  max_value: numField(0, 100000, "Maximum"),
  decimals: intField(0, 3, "Decimals").transform((v) => v ?? 2),
  protocol_note: str(500),
});
