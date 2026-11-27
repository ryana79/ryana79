import type { EventFormOutput } from "@/lib/validation/admin";
import { parseJotformInput } from "@/lib/jotform";
import { sanitizeRichText } from "@/lib/sanitize";

/** Maps validated form output to the events table row. Pure and unit tested. */
export function eventToRow(v: EventFormOutput) {
  const jotform = v.jotform_input ? parseJotformInput(v.jotform_input) : null;
  return {
    title: v.title,
    slug: v.slug,
    event_type: v.event_type,
    summary: v.summary,
    description: v.description ? sanitizeRichText(v.description) : null,
    event_date: v.event_date,
    start_time: v.start_time,
    end_time: v.end_time,
    time_zone: v.time_zone,
    venue_name: v.venue_name,
    address_line: v.address_line,
    city: v.city,
    state: v.state,
    postal_code: v.postal_code,
    region: v.region,
    eligible_age_min: v.eligible_age_min,
    eligible_age_max: v.eligible_age_max,
    eligible_grades: v.eligible_grades,
    eligible_grad_years: v.eligible_grad_years,
    eligibility_notes: v.eligibility_notes,
    price_cents: v.price_dollars,
    price_note: v.price_note,
    capacity: v.capacity,
    registration_status: v.registration_status,
    itinerary: v.itinerary.map((i) => ({ time: i.time || undefined, title: i.title, description: i.description || undefined })),
    faqs: v.faqs,
    hero_image_path: v.hero_image_path,
    card_image_path: v.card_image_path,
    gallery: v.gallery.map((g) => ({ path: g.path, alt: g.alt || undefined })),
    jotform_form_id: jotform && jotform.ok ? jotform.formId : null,
    jotform_url: jotform && jotform.ok ? jotform.url : null,
    featured: v.featured,
    seo_title: v.seo_title,
    seo_description: v.seo_description,
  };
}

/** Reverse mapping for editing: DB row → form default values. */
export function eventToFormValues(e: {
  title: string; slug: string; event_type: string; summary: string | null; description: string | null; event_date: string | null;
  start_time: string | null; end_time: string | null; time_zone: string; venue_name: string | null; address_line: string | null;
  city: string | null; state: string | null; postal_code: string | null; region: string | null; eligible_age_min: number | null;
  eligible_age_max: number | null; eligible_grades: number[]; eligible_grad_years: number[]; eligibility_notes: string | null;
  price_cents: number | null; price_note: string | null; capacity: number | null; registration_status: string;
  itinerary: { time?: string; title: string; description?: string }[]; faqs: { question: string; answer: string }[];
  hero_image_path: string | null; card_image_path: string | null; gallery: { path: string; alt?: string }[];
  jotform_form_id: string | null; jotform_url: string | null; featured: boolean; seo_title: string | null; seo_description: string | null;
}) {
  return {
    title: e.title,
    slug: e.slug,
    event_type: e.event_type,
    summary: e.summary ?? "",
    description: e.description ?? "",
    event_date: e.event_date ?? "",
    start_time: e.start_time?.slice(0, 5) ?? "",
    end_time: e.end_time?.slice(0, 5) ?? "",
    time_zone: e.time_zone,
    venue_name: e.venue_name ?? "",
    address_line: e.address_line ?? "",
    city: e.city ?? "",
    state: e.state ?? "",
    postal_code: e.postal_code ?? "",
    region: e.region ?? "",
    eligible_age_min: e.eligible_age_min?.toString() ?? "",
    eligible_age_max: e.eligible_age_max?.toString() ?? "",
    eligible_grades: e.eligible_grades.map(String),
    eligible_grad_years: e.eligible_grad_years.join(", "),
    eligibility_notes: e.eligibility_notes ?? "",
    price_dollars: e.price_cents === null ? "" : (e.price_cents / 100).toFixed(2).replace(/\.00$/, ""),
    price_note: e.price_note ?? "",
    capacity: e.capacity?.toString() ?? "",
    registration_status: e.registration_status,
    itinerary: e.itinerary.map((i) => ({ time: i.time ?? "", title: i.title, description: i.description ?? "" })),
    faqs: e.faqs,
    hero_image_path: e.hero_image_path ?? "",
    card_image_path: e.card_image_path ?? "",
    gallery: e.gallery.map((g) => ({ path: g.path, alt: g.alt ?? "" })),
    jotform_input: e.jotform_url ?? e.jotform_form_id ?? "",
    featured: e.featured,
    seo_title: e.seo_title ?? "",
    seo_description: e.seo_description ?? "",
  };
}
