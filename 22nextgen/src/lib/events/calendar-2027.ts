import type { EventRow } from "@/lib/types";

export type CalendarEvent = {
  slug: string;
  title: string;
  dateLabel: string;
  teaser: string;
  details: string[];
  event_date: string;
  event_type: "combine" | "other";
};

/** Public 2027 dates. Venues, prices, and eligibility stay off until they are provided. */
export const CALENDAR_2027: CalendarEvent[] = [
  {
    slug: "shore-easter-classic",
    title: "Shore Easter Classic",
    dateLabel: "Saturday, March 27, 2027",
    teaser: "Spring football starts here.",
    details: ["Youth 5v5 football tournament."],
    event_date: "2027-03-27",
    event_type: "other",
  },
  {
    slug: "her-flag-performance",
    title: "Her Flag Performance Combine + All-Star Game",
    dateLabel: "Saturday–Sunday, June 26–27, 2027",
    teaser: "Two days. Combine testing and All-Star football.",
    details: ["Saturday: Girls flag football combine.", "Sunday: All-Star Game."],
    event_date: "2027-06-26",
    event_type: "combine",
  },
  {
    slug: "usa-freedom-football-day",
    title: "USA Freedom Football Day",
    dateLabel: "Saturday, July 17, 2027",
    teaser: "A summer day of football, competition, and community.",
    details: [],
    event_date: "2027-07-17",
    event_type: "other",
  },
  {
    slug: "turkey-bowl-2027",
    title: "Turkey Bowl Combine Classic",
    dateLabel: "Saturday, November 27, 2027",
    teaser: "The Turkey Bowl returns Thanksgiving weekend.",
    details: [],
    event_date: "2027-11-27",
    event_type: "combine",
  },
];

export const CALENDAR_2027_SLUGS = new Set(CALENDAR_2027.map((event) => event.slug));

export const FEATURED_2027 = CALENDAR_2027[0];

export function calendarEvent(slug: string): CalendarEvent | null {
  return CALENDAR_2027.find((event) => event.slug === slug) ?? null;
}

export function isCalendar2027(slug: string): boolean {
  return CALENDAR_2027_SLUGS.has(slug);
}

export function asPublicCalendar(event: CalendarEvent, row?: EventRow | null): EventRow {
  return {
    id: row?.id ?? event.slug,
    slug: event.slug,
    title: event.title,
    event_type: event.event_type,
    summary: event.teaser,
    description: null,
    event_date: event.event_date,
    start_time: null,
    end_time: null,
    time_zone: "America/New_York",
    venue_name: row?.venue_name ?? null,
    address_line: row?.address_line ?? null,
    city: row?.city ?? null,
    state: row?.state ?? null,
    postal_code: row?.postal_code ?? null,
    region: row?.region ?? null,
    eligible_age_min: null,
    eligible_age_max: null,
    eligible_grades: [],
    eligible_grad_years: [],
    eligibility_notes: null,
    price_cents: null,
    price_note: null,
    capacity: null,
    registration_status: "coming_soon",
    itinerary: [],
    faqs: [],
    hero_image_path: null,
    card_image_path: null,
    gallery: [],
    jotform_form_id: null,
    jotform_url: null,
    featured: event.slug === FEATURED_2027.slug,
    status: "published",
    published_at: row?.published_at ?? "2026-11-27T00:00:00.000Z",
    seo_title: event.title,
    seo_description: event.teaser,
    created_at: row?.created_at ?? "2026-11-27T00:00:00.000Z",
    updated_at: row?.updated_at ?? "2026-11-27T00:00:00.000Z",
  };
}

type EventFilter = { type?: string; region?: string; past?: boolean };

function calendarMatches(event: CalendarEvent, filter: EventFilter): boolean {
  if (filter.past) return false;
  if (filter.region) return false;
  if (filter.type && filter.type !== event.event_type) return false;
  return true;
}

/** Adds the 2027 dates to a public list without inventing a venue, price, or grade range. */
export function mergeCalendarEvents(events: EventRow[], filter: EventFilter = {}): EventRow[] {
  const extras = CALENDAR_2027.filter((event) => calendarMatches(event, filter)).map((event) => asPublicCalendar(event, events.find((row) => row.slug === event.slug)));
  const rest = events.filter((event) => !CALENDAR_2027_SLUGS.has(event.slug));
  return [...rest, ...extras].sort((a, b) => (a.event_date ?? "9999").localeCompare(b.event_date ?? "9999"));
}
