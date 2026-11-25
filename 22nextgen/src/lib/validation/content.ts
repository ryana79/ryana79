import { z } from "zod";

const text = (max: number) => z.string().trim().max(max).default("");
const href = z
  .string()
  .trim()
  .max(300)
  .default("")
  .refine((v) => v === "" || /^\/(?!\/)[^\s]*$/.test(v) || /^https:\/\/[^\s]+$/i.test(v), "Use a site path like /events or a full https:// link.");
const optionalText = (max: number) => text(max).transform((v) => v || null);
const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .default("")
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), "Use a full https:// link.")
  .transform((v) => v || null);
const lines = (maxItems: number, maxLen = 200) =>
  z
    .string()
    .default("")
    .transform((v) => v.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))
    .refine((a) => a.length <= maxItems, `At most ${maxItems} lines.`)
    .refine((a) => a.every((l) => l.length <= maxLen), `Each line must be ${maxLen} characters or fewer.`);

const section = z.object({ enabled: z.boolean().default(true), title: text(120), description: text(400) });

export const siteContentSchema = z.object({
  hero: z.object({
    enabled: z.boolean().default(true),
    headline: text(80),
    subhead: text(120),
    tagline: text(160),
    primary_cta_label: text(40),
    primary_cta_href: href,
    secondary_cta_label: text(40),
    secondary_cta_href: href,
    background_image_path: optionalText(300),
  }),
  events: section,
  athletes: section,
  leaderboards: section,
  news: section,
  membership_section: section,
  sponsors: section,
  membership: z.object({
    name: text(60),
    price_dollars: z.string().trim().default("").refine((v) => v === "" || (/^\d{1,4}(\.\d{1,2})?$/.test(v) && Number(v) >= 0), "Enter a price like 19.99."),
    interval: z.enum(["month", "year", "one_time"]).default("month"),
    available_benefits: lines(15),
    planned_benefits: lines(15),
  }),
  contact: z.object({
    email: z.string().trim().default("").refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Enter a valid email.").transform((v) => v || null),
    phone: optionalText(40),
    address: optionalText(300),
    instagram: optionalUrl,
    x: optionalUrl,
    youtube: optionalUrl,
    facebook: optionalUrl,
    tiktok: optionalUrl,
  }),
  sponsor_packages: z.object({
    min_dollars: z.string().trim().default("").refine((v) => v === "" || /^\d{1,6}$/.test(v), "Whole dollars only."),
    max_label: text(40),
    annual_partner_label: text(40),
    notes: text(1000),
  }),
});
export type SiteContentInput = z.input<typeof siteContentSchema>;
export type SiteContentOutput = z.output<typeof siteContentSchema>;
