import { describe, expect, it } from "vitest";
import { LOMBARDI_DIRECTIONS_URL, TURKEY_BOWL_EVENT, asPublicTurkeyBowl, directionsFor, mergeTurkeyBowl } from "@/lib/events/turkey-bowl";
import type { EventRow } from "@/lib/types";

describe("Turkey Bowl public event", () => {
  it("stays closed and points directions at the Lombardi Field pin", () => {
    const event = asPublicTurkeyBowl({ ...TURKEY_BOWL_EVENT, registration_status: "open", jotform_url: "https://form.jotform.com/250123456789012" });
    expect(event.registration_status).toBe("closed");
    expect(event.jotform_url).toBeNull();
    expect(event.jotform_form_id).toBeNull();
    expect(directionsFor(event)).toBe(LOMBARDI_DIRECTIONS_URL);
    expect(directionsFor(event)).toContain("query_place_id=ChIJGR0zOdHNw4kR34MkxjntzTI");
  });

  it("shows on upcoming and combine lists, and stays off other filters", () => {
    expect(mergeTurkeyBowl([]).map((event) => event.slug)).toEqual(["turkey-bowl"]);
    expect(mergeTurkeyBowl([], { type: "combine" })).toHaveLength(1);
    expect(mergeTurkeyBowl([], { type: "showcase" })).toHaveLength(0);
    expect(mergeTurkeyBowl([], { past: true })).toHaveLength(0);
    const duplicate = mergeTurkeyBowl([TURKEY_BOWL_EVENT, { ...TURKEY_BOWL_EVENT, id: "other", slug: "spring-showcase", event_date: "2026-12-01" } as EventRow]);
    expect(duplicate.map((event) => event.slug)).toEqual(["turkey-bowl", "spring-showcase"]);
  });
});
