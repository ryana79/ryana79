import { z } from "zod";
import { CALENDAR_2027_SLUGS } from "@/lib/events/calendar-2027";

const trimmed = (max: number) => z.string().trim().max(max);

export const GRADE_BANDS = ["3rd-6th grade", "7th-9th grade", "Other"] as const;

export const eventLeadSchema = z.object({
  name: trimmed(160).min(1, "Enter the parent or guardian name."),
  email: z.string().trim().max(254).email("Enter a valid email address.").transform((value) => value.toLowerCase()),
  grade_band: z.union([z.enum(GRADE_BANDS), z.literal("")]).optional(),
  town: trimmed(120).optional().or(z.literal("")),
  events: z.union([z.string(), z.array(z.string())]).transform((value) => (Array.isArray(value) ? value : [value])).pipe(z.array(z.string()).min(1, "Choose at least one event.").max(8)),
  news_opt_in: z.boolean().optional().default(false),
  website: z.string().max(0).optional().or(z.literal("")),
}).superRefine((value, ctx) => {
  const unique = [...new Set(value.events)];
  if (unique.length !== value.events.length || unique.some((slug) => !CALENDAR_2027_SLUGS.has(slug))) {
    ctx.addIssue({ code: "custom", path: ["events"], message: "Choose an event from the 2027 calendar." });
  }
});

export type EventLeadInput = z.infer<typeof eventLeadSchema>;
