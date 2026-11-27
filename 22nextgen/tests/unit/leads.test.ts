import { describe, expect, it } from "vitest";
import { eventLeadSchema } from "@/lib/validation/leads";
import { normalizeEmail, parseMarketingPermission, planLeadImport, planLeadMatch, type StoredLead } from "@/lib/leads/import";
import { mergeCalendarEvents } from "@/lib/events/calendar-2027";

const stored = (over: Partial<StoredLead> = {}): StoredLead => ({
  parent_name: "Pat Example",
  town: "Old Bridge",
  grade_band: "5",
  marketing_permission: "unknown",
  news_opt_in: true,
  tags: [],
  source: "website",
  ...over,
});

describe("event lead import", () => {
  it("classifies new rows, file repeats, existing emails, and rows without a parent email", () => {
    const plan = planLeadImport([
      { line: 2, name: "Pat Example", email: "Pat@Example.com", town: "Old Bridge", grade: "5", permission: "" },
      { line: 3, name: "Pat Example", email: "pat@example.com", town: "", grade: "", permission: "yes" },
      { line: 4, name: "Sam Example", email: "sam@example.com", town: "", grade: "", permission: "no thanks" },
      { line: 5, name: "No Email", email: "", town: "", grade: "", permission: "" },
      { line: 6, name: "", email: "noname@example.com", town: "", grade: "", permission: "" },
    ], new Set(["sam@example.com"]));
    expect(plan.map((row) => row.status)).toEqual(["valid", "duplicate", "duplicate", "skipped", "skipped"]);
    expect(plan[0].permission).toBe("unknown");
    expect(plan[1].permission).toBe("opted_in");
    expect(plan[2].email).toBe("sam@example.com");
  });

  it("matches an existing contact without removing interests or replacing a known permission", () => {
    const optedIn = planLeadMatch(stored({ marketing_permission: "opted_in", tags: ["Turkey Bowl 2026"] }), { town: "Newark", grade: "8", permission: "unknown" });
    expect(optedIn.marketing_permission).toBeUndefined();
    expect(optedIn.town).toBeUndefined();
    expect(optedIn.tags).toEqual(["Turkey Bowl 2026"]);
    expect(optedIn.recordPermission).toBe(false);

    const fill = planLeadMatch(stored({ town: null, grade_band: null, marketing_permission: "unknown" }), { town: "Belmar", grade: "6", permission: "opted_in" });
    expect(fill.town).toBe("Belmar");
    expect(fill.grade_band).toBe("6");
    expect(fill.marketing_permission).toBe("opted_in");
    expect(fill.recordPermission).toBe(true);
    expect(fill.tags).toContain("Turkey Bowl 2026");
  });

  it("accepts a parent update for more than one event and rejects a missing email", () => {
    expect(normalizeEmail("  Parent@Example.com ")).toBe("parent@example.com");
    expect(parseMarketingPermission("I agree to receive updates")).toBe("opted_in");
    expect(parseMarketingPermission("maybe")).toBe("unknown");
    const parsed = eventLeadSchema.parse({
      name: "Pat Example",
      email: "Pat@Example.com",
      grade_band: "",
      town: "",
      events: ["shore-easter-classic", "her-flag-performance"],
      news_opt_in: false,
      website: "",
    });
    expect(parsed.email).toBe("pat@example.com");
    expect(eventLeadSchema.safeParse({ name: "Pat", email: "not-an-email", events: ["shore-easter-classic"], website: "" }).success).toBe(false);
  });
});

describe("2027 calendar", () => {
  it("lists the four dates without treating them as past or regional", () => {
    const events = mergeCalendarEvents([], {});
    expect(events.map((event) => event.slug)).toEqual(["shore-easter-classic", "her-flag-performance", "usa-freedom-football-day", "turkey-bowl-2027"]);
    expect(events.every((event) => event.venue_name === null && event.price_cents === null && event.eligible_grades.length === 0)).toBe(true);
    expect(mergeCalendarEvents([], { type: "combine" }).map((event) => event.slug)).toEqual(["her-flag-performance", "turkey-bowl-2027"]);
    expect(mergeCalendarEvents([], { region: "Central Jersey" })).toHaveLength(0);
    expect(mergeCalendarEvents([], { past: true })).toHaveLength(0);
  });
});
