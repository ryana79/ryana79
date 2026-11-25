import type { EventRow } from "@/lib/types";

/** Public slug. The page lives at /events/turkey-bowl. */
export const TURKEY_BOWL_SLUG = "turkey-bowl";

/**
 * Google Maps pin for Lombardi Field at Carl Sandburg Middle School,
 * 3439 County Rd 516, Old Bridge, NJ 08857. Place id ChIJGR0zOdHNw4kR34MkxjntzTI.
 */
export const LOMBARDI_DIRECTIONS_URL =
  "https://www.google.com/maps/search/?api=1&query=Lombardi%20Field%2C%203439%20County%20Rd%20516%2C%20Old%20Bridge%2C%20NJ%2008857&query_place_id=ChIJGR0zOdHNw4kR34MkxjntzTI";

export const TURKEY_BOWL_COPY = {
  title: "2026 Turkey Bowl Youth Combine + Clinic",
  summary: "Registration is closed. Youth and older divisions check in at Lombardi Field in Old Bridge.",
  presentedBy: "Presented by 22 Fitness × QB Life Academy",
  dateLabel: "Saturday, November 28, 2026",
  locationLabel: "Lombardi Field · Old Bridge, NJ",
  gradesLabel: "Grades 3–9",
  statusLabel: "Registration Closed",
  intro:
    "Registration is closed. We’ll see our registered athletes at Lombardi Field on Saturday, November 28. Please check your division’s arrival time below.",
  scheduleNote: "All times are Eastern. Check-in opens one hour before each division starts.",
  expect: [
    "Athletes will run the 40-yard dash and 5-10-5 shuttle, test their broad jump and vertical jump, and take part in position-specific coaching and a strength competition.",
    "Athletes selected through combine testing and position work will compete in the all-star 7-on-7 game.",
    "Standout athletes will be recognized with awards, including sponsored MVP belts.",
    "Every registered athlete receives a Turkey Bowl T-shirt, an official player profile card, and their individual combine results. Event media will capture highlights throughout the day.",
  ],
  families: "Santa Claus will be at the event, and Project Love Creative will offer free family portraits.",
} as const;

export const TURKEY_BOWL_DIVISIONS = [
  {
    name: "Youth Division",
    grades: "3rd–6th Grade",
    steps: [
      { time: "3:00 PM", title: "Athlete check-in opens" },
      { time: "4:00 PM", title: "Combine and clinic begin" },
      { time: "6:00 PM", title: "Event ends" },
    ],
  },
  {
    name: "Older Division",
    grades: "7th–9th Grade",
    steps: [
      { time: "5:00 PM", title: "Athlete check-in opens" },
      { time: "6:00 PM", title: "Combine and clinic begin" },
      { time: "8:00 PM", title: "Event ends" },
    ],
  },
] as const;

/** Belt sponsors. Names only — approved logo files are not in the repository. */
export const TURKEY_BOWL_SPONSORS = [
  { name: "Thrive Spine & Sports Rehab", belt: "Camp MVP Belt" },
  { name: "Mezzacappa Concrete", belt: "Offensive MVP Belt" },
  { name: "Mazza Recycling", belt: "Defensive MVP Belt" },
  { name: "Rizzo Heating & Plumbing", belt: "Youth MVP Belt" },
  { name: "Anchor Pest Control", belt: "Youth Defensive MVP Belt" },
] as const;

export const TURKEY_BOWL_EVENT: EventRow = {
  id: "turkey-bowl",
  slug: TURKEY_BOWL_SLUG,
  title: TURKEY_BOWL_COPY.title,
  event_type: "combine",
  summary: "Registration is closed. Youth and older divisions check in at Lombardi Field in Old Bridge.",
  description: null,
  event_date: "2026-11-28",
  start_time: null,
  end_time: null,
  time_zone: "America/New_York",
  venue_name: "Lombardi Field",
  address_line: "3439 County Rd 516",
  city: "Old Bridge",
  state: "NJ",
  postal_code: "08857",
  region: "Central Jersey",
  eligible_age_min: null,
  eligible_age_max: null,
  eligible_grades: [3, 4, 5, 6, 7, 8, 9],
  eligible_grad_years: [],
  eligibility_notes: "Youth Division is 3rd–6th grade. Older Division is 7th–9th grade.",
  price_cents: null,
  price_note: null,
  capacity: null,
  registration_status: "closed",
  itinerary: [],
  faqs: [],
  hero_image_path: null,
  card_image_path: null,
  gallery: [],
  jotform_form_id: null,
  jotform_url: null,
  featured: true,
  status: "published",
  published_at: "2026-11-25T00:00:00.000Z",
  seo_title: "2026 Turkey Bowl Youth Combine + Clinic",
  seo_description: "Registration is closed for the November 28, 2026 Turkey Bowl Youth Combine + Clinic at Lombardi Field in Old Bridge, NJ. Check-in times for grades 3–9.",
  created_at: "2026-11-25T00:00:00.000Z",
  updated_at: "2026-11-25T00:00:00.000Z",
};

/** Public copy wins over a stored row so a closed event cannot be shown as open. */
export function asPublicTurkeyBowl(row?: EventRow | null): EventRow {
  return {
    ...TURKEY_BOWL_EVENT,
    ...(row ?? {}),
    id: row?.id ?? TURKEY_BOWL_EVENT.id,
    slug: TURKEY_BOWL_SLUG,
    title: TURKEY_BOWL_COPY.title,
    summary: TURKEY_BOWL_COPY.summary,
    event_type: "combine",
    event_date: "2026-11-28",
    start_time: null,
    end_time: null,
    time_zone: "America/New_York",
    venue_name: "Lombardi Field",
    address_line: "3439 County Rd 516",
    city: "Old Bridge",
    state: "NJ",
    postal_code: "08857",
    region: "Central Jersey",
    eligible_grades: [3, 4, 5, 6, 7, 8, 9],
    registration_status: "closed",
    jotform_form_id: null,
    jotform_url: null,
    featured: true,
    status: "published",
    hero_image_path: row?.hero_image_path ?? null,
    card_image_path: row?.card_image_path ?? null,
  };
}

export function directionsFor(event: Pick<EventRow, "slug" | "venue_name" | "address_line" | "city" | "state" | "postal_code">): string | null {
  if (event.slug === TURKEY_BOWL_SLUG) return LOMBARDI_DIRECTIONS_URL;
  const query = [event.venue_name, event.address_line, event.city, event.state, event.postal_code].filter(Boolean).join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

export function checkInHref(slug: string): string {
  return `/events/${slug}#check-in`;
}

type EventFilter = { type?: string; region?: string; past?: boolean };

function turkeyBowlMatches(filter: EventFilter): boolean {
  if (filter.past) return false;
  if (filter.type && filter.type !== "combine") return false;
  if (filter.region && filter.region !== "Central Jersey") return false;
  return true;
}

/** Ensures the closed Turkey Bowl appears in upcoming lists, and never as an open registration. */
export function mergeTurkeyBowl(events: EventRow[], filter: EventFilter = {}): EventRow[] {
  const existing = events.find((event) => event.slug === TURKEY_BOWL_SLUG);
  const rest = events.filter((event) => event.slug !== TURKEY_BOWL_SLUG);
  if (!turkeyBowlMatches(filter)) return rest;
  const event = asPublicTurkeyBowl(existing);
  return [event, ...rest].sort((a, b) => (a.event_date ?? "9999").localeCompare(b.event_date ?? "9999"));
}
