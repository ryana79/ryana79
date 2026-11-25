import { describe, expect, it } from "vitest";
import { availableProtocols, buildLeaderboard, validateCombineValue, type LeaderboardInput } from "@/lib/leaderboard";
import { matchAthlete, normalizeName, withinFileKey, type MatchableAthlete } from "@/lib/matching";
import { answerText, extractHints, extractRegistration, tokensMatch, validateApiBase, validateSubmission } from "@/lib/jotform-webhook";
import { parseJotformInput, embedUrlForEvent } from "@/lib/jotform";
import { can } from "@/lib/permissions";
import { csvCell, toCsv } from "@/lib/csv";
import { sanitizeRichText, stripHtml } from "@/lib/sanitize";
import { sniffImage } from "@/lib/image-sniff";
import { parseVideoUrl } from "@/lib/video";
import { sanitizeParams } from "@/lib/analytics";

const row = (athleteId: string, value: number, extra: Partial<LeaderboardInput> = {}): LeaderboardInput => ({
  resultId: `${athleteId}-${value}`, athleteId, value, protocol: "laser", testedOn: "2027-05-16", eventId: "e1", athleteName: athleteId.toUpperCase(), ...extra,
});

describe("leaderboard", () => {
  it("sorts lower-is-better ascending and higher-is-better descending", () => {
    const rows = [row("a", 5.4), row("b", 5.1), row("c", 5.9)];
    expect(buildLeaderboard(rows, "lower_is_better", "laser").map((r) => r.athleteId)).toEqual(["b", "a", "c"]);
    expect(buildLeaderboard(rows, "higher_is_better", "laser").map((r) => r.athleteId)).toEqual(["c", "a", "b"]);
  });

  it("uses each athlete's best result once", () => {
    const board = buildLeaderboard([row("a", 5.6), row("a", 5.2), row("a", 5.9), row("b", 5.3)], "lower_is_better", "laser");
    expect(board.map((r) => [r.athleteId, r.value, r.rank])).toEqual([["a", 5.2, 1], ["b", 5.3, 2]]);
  });

  it("never mixes protocols", () => {
    const rows = [row("a", 4.9, { protocol: "hand" }), row("b", 5.3), row("c", 5.0, { protocol: "hand" })];
    expect(buildLeaderboard(rows, "lower_is_better", "laser").map((r) => r.athleteId)).toEqual(["b"]);
    expect(buildLeaderboard(rows, "lower_is_better", "hand").map((r) => r.athleteId)).toEqual(["a", "c"]);
    expect(availableProtocols(rows)).toEqual(["hand", "laser"]);
  });

  it("gives ties a shared rank, earlier test date first", () => {
    const board = buildLeaderboard([row("a", 5.0, { testedOn: "2027-06-01" }), row("b", 5.0, { testedOn: "2027-05-01" }), row("c", 5.1)], "lower_is_better", "laser");
    expect(board.map((r) => [r.athleteId, r.rank])).toEqual([["b", 1], ["a", 1], ["c", 3]]);
  });

  it("ignores non-positive and non-finite values", () => {
    expect(buildLeaderboard([row("a", 0), row("b", Number.NaN), row("c", -3), row("d", 5)], "lower_is_better", "laser").map((r) => r.athleteId)).toEqual(["d"]);
  });
});

describe("combine value validation", () => {
  const range = { min: 3.5, max: 12, name: "40-Yard Dash", unit: "s" };
  it("accepts plausible numbers, including numeric strings", () => {
    expect(validateCombineValue("5.42", range)).toEqual({ ok: true, value: 5.42 });
    expect(validateCombineValue(4.5, range)).toEqual({ ok: true, value: 4.5 });
  });
  it("rejects non-numbers, zero, negatives and out-of-range values", () => {
    for (const bad of ["abc", "", null, undefined, 0, -1, 1.2, 99]) expect(validateCombineValue(bad, range).ok, String(bad)).toBe(false);
  });
});

describe("athlete matching", () => {
  const athletes: MatchableAthlete[] = [
    { id: "11111111-1111-4111-8111-111111111111", first_name: "Jordan", last_name: "Smith", graduation_year: 2031, team: "Eagles", parent_email: "pat@example.com", external_ids: [{ source_system: "sheet", external_id: "A1" }] },
    { id: "22222222-2222-4222-8222-222222222222", first_name: "Jordan", last_name: "Smith", graduation_year: 2029, team: "Hawks", parent_email: null },
    { id: "33333333-3333-4333-8333-333333333333", first_name: "Casey", last_name: "Jones", graduation_year: 2030, team: null },
  ];

  it("matches on internal id and on external id within the same source system", () => {
    expect(matchAthlete({ internal_id: athletes[2].id }, athletes)).toMatchObject({ status: "matched", athlete_id: athletes[2].id });
    expect(matchAthlete({ external_id: "A1", source_system: "sheet", last_name: "Whoever" }, athletes)).toMatchObject({ status: "matched", athlete_id: athletes[0].id });
    expect(matchAthlete({ external_id: "A1", source_system: "other", first_name: "Nobody", last_name: "Else" }, athletes).status).toBe("new");
  });

  it("matches exact name + class when corroborated by team or parent email", () => {
    expect(matchAthlete({ first_name: "jordan", last_name: "SMITH", graduation_year: 2031, team: "eagles" }, athletes)).toMatchObject({ status: "matched", athlete_id: athletes[0].id });
    expect(matchAthlete({ first_name: "Jordan", last_name: "Smith", graduation_year: 2031, parent_email: "PAT@example.com" }, athletes)).toMatchObject({ status: "matched" });
  });

  it("never auto-matches name + class alone, or same name in different classes", () => {
    expect(matchAthlete({ first_name: "Casey", last_name: "Jones", graduation_year: 2030 }, athletes).status).toBe("ambiguous");
    expect(matchAthlete({ first_name: "Jordan", last_name: "Smith" }, athletes).status).toBe("ambiguous");
  });

  it("treats unrelated names as new and tolerates accents and suffixes", () => {
    expect(matchAthlete({ first_name: "Brand", last_name: "New", graduation_year: 2033 }, athletes).status).toBe("new");
    expect(normalizeName("José Smith Jr.")).toBe("josesmith");
  });

  it("builds within-file duplicate keys from external id or normalized name + class", () => {
    expect(withinFileKey({ first_name: "Jordan", last_name: "Smith", graduation_year: 2031 })).toBe(withinFileKey({ first_name: " JORDAN ", last_name: "smith", graduation_year: 2031 }));
    expect(withinFileKey({ first_name: "Jordan", last_name: "Smith", graduation_year: 2031 })).not.toBe(withinFileKey({ first_name: "Jordan", last_name: "Smith", graduation_year: 2030 }));
    expect(withinFileKey({ external_id: "A1", source_system: "s" })).toBe("ext:s:a1");
    expect(withinFileKey({ first_name: "", last_name: "" })).toBeNull();
  });
});

describe("jotform webhook helpers", () => {
  it("compares tokens safely", () => {
    expect(tokensMatch("secret", "secret")).toBe(true);
    for (const [a, b] of [["secret", "Secret"], ["", "secret"], [null, "secret"], ["secret", null], ["sec", "secret"]] as const) expect(tokensMatch(a, b)).toBe(false);
  });

  it("reads only numeric ID hints from the body", () => {
    const body = new Map<string, unknown>([["submissionID", "5551234567890"], ["formID", "250123456789012"], ["rawRequest", "{\"q3_name\":\"hacker\"}"]]);
    expect(extractHints(body)).toEqual({ submissionId: "5551234567890", formId: "250123456789012" });
    expect(extractHints(new Map([["submissionID", "1; drop table"], ["formID", "abc"]]))).toEqual({ submissionId: null, formId: null });
    expect(extractHints(new Map([["submissionID", "../../etc/passwd"], ["formID", "250123456789012"]])).submissionId).toBeNull();
  });

  it("allows only https jotform hosts for the API base (SSRF guard)", () => {
    for (const ok of ["https://api.jotform.com", "https://eu-api.jotform.com", "https://api.jotform.pro"]) expect(validateApiBase(ok), ok).toBe(true);
    for (const bad of ["http://api.jotform.com", "https://evil.example.com", "https://jotform.com.evil.example", "https://user:pw@api.jotform.com", "https://127.0.0.1", "not a url", "https://api.jotform.com@evil.com"]) expect(validateApiBase(bad), bad).toBe(false);
  });

  const hints = { submissionId: "5551234567890", formId: "250123456789012" };
  const payload = (over: Record<string, unknown> = {}, code = 200) => ({ responseCode: code, content: { id: hints.submissionId, form_id: hints.formId, status: "ACTIVE", created_at: "2027-04-01 10:30:00", answers: {}, ...over } });

  it("rejects submissions that do not match the hints or are deleted", () => {
    expect(validateSubmission(payload(), hints).ok).toBe(true);
    expect(validateSubmission(payload({ id: "999" }), hints)).toMatchObject({ ok: false, reason: "Submission ID mismatch" });
    expect(validateSubmission(payload({ form_id: "123" }), hints)).toMatchObject({ ok: false, reason: "Form ID mismatch" });
    expect(validateSubmission(payload({ status: "DELETED" }), hints).ok).toBe(false);
    expect(validateSubmission(payload({}, 401), hints).ok).toBe(false);
    expect(validateSubmission(null, hints).ok).toBe(false);
  });

  it("extracts allowlisted registration fields and skips sensitive or non-data controls", () => {
    const sub = {
      id: hints.submissionId, form_id: hints.formId, created_at: "2027-04-01 10:30:00",
      answers: {
        1: { type: "control_fullname", text: "Athlete name", answer: { first: "Jordan", last: "Smith" } },
        2: { type: "control_fullname", text: "Parent/guardian name", answer: { first: "Pat", last: "Smith" } },
        3: { type: "control_email", text: "Parent email", answer: "Pat@Example.com" },
        4: { type: "control_phone", text: "Phone", answer: { full: "555-0100" } },
        5: { type: "control_dropdown", text: "Graduation year", answer: "Class of 2031" },
        6: { type: "control_dropdown", text: "Grade", answer: "8th" },
        7: { type: "control_textbox", text: "Position", answer: "WR" },
        8: { type: "control_textbox", text: "Team", answer: "Eagles" },
        9: { type: "control_textarea", text: "Allergies or medical conditions", answer: "Peanuts" },
        10: { type: "control_signature", text: "Waiver signature", answer: "data:image/png;base64,AAAA" },
        11: { type: "control_fileupload", text: "Photo", answer: ["https://files.jotform.com/x.jpg"] },
        12: { type: "control_payment", text: "Payment", answer: { cardNumber: "4242424242424242" } },
        13: { type: "control_textbox", text: "T-shirt size", answer: "Youth M" },
      },
    };
    const reg = extractRegistration(sub);
    expect(reg).toMatchObject({ participant_first_name: "Jordan", participant_last_name: "Smith", parent_name: "Pat Smith", parent_email: "pat@example.com", graduation_year: 2031, grade: 8, position: "WR", team: "Eagles", parent_phone: "555-0100" });
    expect(reg.answers).toEqual({ "T-shirt size": "Youth M" });
    expect(reg.submitted_at).toBe("2027-04-01T10:30:00.000Z");
    expect(JSON.stringify(reg)).not.toMatch(/Peanuts|4242|data:image|files\.jotform/);
  });

  it("flattens structured answers", () => {
    expect(answerText({ first: "A", last: "B" })).toBe("A B");
    expect(answerText({ year: 2012, month: 4, day: 8 })).toBe("2012-04-08");
    expect(answerText(["x", "y"])).toBe("x, y");
  });
});

describe("jotform URL / ID parsing", () => {
  it("accepts a numeric id or jotform links and extracts the form id", () => {
    expect(parseJotformInput("250123456789012")).toMatchObject({ ok: true, formId: "250123456789012", url: "https://form.jotform.com/250123456789012" });
    expect(parseJotformInput("https://form.jotform.com/250123456789012?x=1")).toMatchObject({ ok: true, formId: "250123456789012", url: "https://form.jotform.com/250123456789012" });
    expect(parseJotformInput("form.jotform.com/250123456789012")).toMatchObject({ ok: true });
  });
  it("warns on links without an id and rejects foreign, insecure or credentialed links", () => {
    const named = parseJotformInput("https://form.jotform.com/some-form-name");
    expect(named).toMatchObject({ ok: true, formId: null });
    expect(named.ok && named.warnings).toHaveLength(1);
    for (const bad of ["", "http://form.jotform.com/250123456789012", "https://evil.com/250123456789012", "https://jotform.com.evil.com/1", "https://u:p@form.jotform.com/250123456789012", "https://form.jotform.com/"]) expect(parseJotformInput(bad).ok, bad).toBe(false);
  });
  it("derives an embed url from the url or the id", () => {
    expect(embedUrlForEvent({ jotform_form_id: "250123456789012", jotform_url: null })).toBe("https://form.jotform.com/250123456789012");
    expect(embedUrlForEvent({ jotform_form_id: null, jotform_url: null })).toBeNull();
    expect(embedUrlForEvent({ jotform_form_id: null, jotform_url: "https://form.jotform.com/250123456789012" })).toBe("https://form.jotform.com/250123456789012");
  });
});

describe("permissions", () => {
  it("restricts capabilities by role", () => {
    expect(can(["owner"], "roles.manage")).toBe(true);
    expect(can(["admin"], "roles.manage")).toBe(false);
    expect(can(["editor"], "events.manage")).toBe(true);
    expect(can(["editor"], "imports.manage")).toBe(false);
    expect(can(["editor"], "results.verify")).toBe(false);
    expect(can(["coach"], "results.enter")).toBe(true);
    expect(can(["coach"], "events.manage")).toBe(false);
    expect(can(["parent"], "dashboard.view")).toBe(false);
    expect(can([], "dashboard.view")).toBe(false);
    expect(can(null, "dashboard.view")).toBe(false);
    expect(can(["editor", "admin"], "imports.manage")).toBe(true);
  });
});

describe("csv export", () => {
  it("escapes quotes and separators and neutralises spreadsheet formulas", () => {
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    for (const f of ["=SUM(A1)", "+1", "-1+1", "@cmd", "\tTAB"]) expect(csvCell(f).startsWith("'") || csvCell(f).startsWith('"\''), f).toBe(true);
    expect(csvCell(["a", "b"])).toBe("a; b");
    expect(csvCell(null)).toBe("");
  });
  it("adds a BOM and CRLF line endings", () => {
    const csv = toCsv(["a", "b"], [{ a: 1, b: "x" }]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("a,b\r\n1,x\r\n");
  });
});

describe("rich text sanitizing", () => {
  it("strips scripts, handlers and dangerous urls", () => {
    const dirty = '<p onclick="x()">Hi<script>alert(1)</script></p><a href="javascript:alert(1)">bad</a><img src="x" onerror="alert(1)"><iframe src="https://evil"></iframe><a href="https://ok.example" target="_blank">ok</a>';
    const clean = sanitizeRichText(dirty);
    expect(clean).not.toMatch(/script|onclick|onerror|javascript:|iframe/i);
    expect(clean).toContain('href="https://ok.example"');
    expect(clean).toContain("noopener");
    expect(stripHtml("<p>Hello <b>there</b></p>")).toBe("Hello there");
  });
});

describe("upload and link safety", () => {
  it("detects images by magic bytes, not by name", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(sniffImage(png)).toEqual({ mime: "image/png", ext: "png" });
    expect(sniffImage(new TextEncoder().encode("<?php echo 1; ?>   "))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)></svg>"))).toBeNull();
  });
  it("embeds only YouTube/Vimeo over https", () => {
    expect(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.embed).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(parseVideoUrl("https://vimeo.com/123456")?.embed).toContain("player.vimeo.com");
    expect(parseVideoUrl("https://example.com/video")?.embed).toBeNull();
    expect(parseVideoUrl("http://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseVideoUrl("javascript:alert(1)")).toBeNull();
  });
  it("drops personal data from analytics params", () => {
    const out = sanitizeParams({ event_slug: "spring", email: "a@b.co", athlete_name: "Jordan Smith", count: 3, nested: { a: 1 } });
    expect(JSON.stringify(out)).not.toMatch(/a@b\.co|Jordan/);
  });
});
