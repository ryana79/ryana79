import { describe, expect, it } from "vitest";
import { eventJsonLd, jsonLdString, zonedIso } from "@/lib/seo";
import { formatCents, formatEventDate, formatTime } from "@/lib/format";
import { eventToRow } from "@/lib/events/mapper";
import { eventSchema } from "@/lib/validation/admin";
import type { EventRow } from "@/lib/types";

describe("event structured data and formatting", () => {
  it("applies the correct New Jersey offset for daylight and standard time", () => {
    expect(zonedIso("2027-05-16", "09:00", "America/New_York")).toBe("2027-05-16T09:00:00-04:00");
    expect(zonedIso("2027-01-16", "09:00", "America/New_York")).toBe("2027-01-16T09:00:00-05:00");
  });

  it("emits SportsEvent JSON-LD with offer and no personal data, and escapes script-breaking characters", () => {
    const e = { slug: "spring", title: "Spring </script><b>", summary: "A combine", description: null, event_date: "2027-05-16", start_time: "09:00:00", end_time: "13:00:00", time_zone: "America/New_York", venue_name: "Demo Field", address_line: null, city: "Newark", state: "NJ", postal_code: null, price_cents: 7500, registration_status: "open", hero_image_path: null, card_image_path: null, price_note: null } as unknown as EventRow;
    const ld = eventJsonLd(e);
    expect(ld).toMatchObject({ "@type": "SportsEvent", startDate: "2027-05-16T09:00:00-04:00", endDate: "2027-05-16T13:00:00-04:00", offers: { price: "75.00", priceCurrency: "USD", availability: "https://schema.org/InStock" } });
    expect(jsonLdString(ld)).not.toContain("</script>");
  });

  it("formats dates, times and prices without timezone drift", () => {
    expect(formatEventDate("2027-05-16")).toBe("Sun, May 16, 2027");
    expect(formatEventDate(null)).toBe("Date to be announced");
    expect(formatTime("13:30:00")).toBe("1:30 PM");
    expect(formatCents(7500)).toBe("$75");
    expect(formatCents(1999, { monthly: true })).toBe("$19.99/month");
    expect(formatCents(null)).toBeNull();
  });
});

describe("event form validation and mapping", () => {
  const base = { title: "Spring Showcase Combine", slug: "spring-showcase-combine", event_type: "combine", registration_status: "open", event_date: "2027-05-16", price_dollars: "75", jotform_input: "250123456789012" };

  it("accepts a valid event and converts dollars to cents", () => {
    const parsed = eventSchema.safeParse(base);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    if (parsed.success) {
      const row = eventToRow(parsed.data);
      expect(row).toMatchObject({ slug: "spring-showcase-combine", price_cents: 7500, jotform_form_id: "250123456789012" });
    }
  });

  it("rejects bad slugs, foreign form links and negative prices", () => {
    expect(eventSchema.safeParse({ ...base, slug: "Bad Slug!" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...base, jotform_input: "https://evil.example.com/1234567890" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...base, price_dollars: "-5" }).success).toBe(false);
  });
});
