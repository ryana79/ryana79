import type { EventRow } from "@/lib/types";
import { BRAND } from "@/lib/site";
import { siteUrl } from "@/lib/env";
import { eventAddress, priceLabel } from "@/lib/event-utils";
import { mediaUrl } from "@/lib/media";
import { stripHtml } from "@/lib/sanitize";

/** ISO-8601 local date-time with the zone's UTC offset, e.g. 2026-06-14T09:00:00-04:00. */
export function zonedIso(date: string, time: string | null, tz: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time ?? "00:00").split(":").map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hh, mm || 0);
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).formatToParts(new Date(asUtc));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const zonedAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    const offsetMin = Math.round((zonedAsUtc - asUtc) / 60000);
    const sign = offsetMin <= 0 ? "-" : "+";
    const abs = Math.abs(offsetMin);
    const off = `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
    return `${date}T${String(hh).padStart(2, "0")}:${String(mm || 0).padStart(2, "0")}:00${off}`;
  } catch {
    return `${date}T${String(hh).padStart(2, "0")}:${String(mm || 0).padStart(2, "0")}:00`;
  }
}

const AVAILABILITY: Record<string, string> = {
  open: "https://schema.org/InStock",
  waitlist: "https://schema.org/LimitedAvailability",
  sold_out: "https://schema.org/SoldOut",
  coming_soon: "https://schema.org/PreOrder",
  closed: "https://schema.org/SoldOut",
};

/** Structured data for an event page. Contains event information only; never athlete or registrant data. */
export function eventJsonLd(e: EventRow) {
  const url = `${siteUrl}/events/${e.slug}`;
  const image = mediaUrl(e.hero_image_path ?? e.card_image_path);
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: e.title,
    description: e.summary || stripHtml(e.description).slice(0, 300) || undefined,
    url,
    sport: "American football",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    organizer: { "@type": "Organization", name: BRAND.company, url: siteUrl },
  };
  if (e.event_date) {
    ld.startDate = e.start_time ? zonedIso(e.event_date, e.start_time, e.time_zone) : e.event_date;
    if (e.end_time) ld.endDate = zonedIso(e.event_date, e.end_time, e.time_zone);
  }
  if (e.venue_name || e.city) {
    ld.location = {
      "@type": "Place",
      name: e.venue_name || eventAddress(e) || e.city,
      address: {
        "@type": "PostalAddress",
        streetAddress: e.address_line || undefined,
        addressLocality: e.city || undefined,
        addressRegion: e.state || undefined,
        postalCode: e.postal_code || undefined,
        addressCountry: "US",
      },
    };
  }
  if (image) ld.image = [image];
  if (e.price_cents !== null && e.price_cents !== undefined) {
    ld.offers = {
      "@type": "Offer",
      url,
      price: (e.price_cents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: AVAILABILITY[e.registration_status] ?? undefined,
      description: priceLabel(e),
    };
  }
  return JSON.parse(JSON.stringify(ld));
}

/** Safe JSON-LD serialization for inline <script> tags. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
