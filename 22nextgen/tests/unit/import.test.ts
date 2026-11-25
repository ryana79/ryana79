import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { parseCsvText, parseSpreadsheet } from "@/lib/import/parse";
import { autoDetectMapping } from "@/lib/import/fields";
import { normalizeAthleteRow, normalizeResultRow, parseHeightInches, parseDate, parseGraduationYear, parseMeasurement, parsePosition, parseState, splitFullName } from "@/lib/import/normalize";
import { buildPreview } from "@/lib/import/preview";
import type { MatchableAthlete } from "@/lib/matching";

const enc = (s: string) => new TextEncoder().encode(s);

describe("csv parsing", () => {
  it("handles quotes, embedded commas/newlines and CRLF", () => {
    const rows = parseCsvText('a,b,c\r\n"x, y","he said ""hi""","line1\nline2"\r\n1,2,3');
    expect(rows).toEqual([["a", "b", "c"], ["x, y", 'he said "hi"', "line1\nline2"], ["1", "2", "3"]]);
  });
  it("strips BOM and skips fully blank rows", async () => {
    const res = await parseSpreadsheet(enc("\uFEFFFirst Name,Last Name\nA,B\n,\n\nC,D\n"), "x.csv");
    expect(res.ok && res.sheets[0].headers).toEqual(["First Name", "Last Name"]);
    expect(res.ok && res.sheets[0].rows).toEqual([["A", "B"], ["C", "D"]]);
  });
  it("de-duplicates repeated and blank headers", async () => {
    const res = await parseSpreadsheet(enc("Name,Name,\nA,B,C\n"), "x.csv");
    expect(res.ok && res.sheets[0].headers).toEqual(["Name", "Name (2)", "Column 3"]);
  });
  it("rejects unsupported and oversize files", async () => {
    expect((await parseSpreadsheet(enc("x"), "x.xls")).ok).toBe(false);
    expect((await parseSpreadsheet(new Uint8Array(6 * 1024 * 1024), "x.csv")).ok).toBe(false);
    expect((await parseSpreadsheet(enc("not a zip"), "x.xlsx")).ok).toBe(false);
  });
});

describe("xlsx parsing", () => {
  it("reads multiple sheets, dates, formulas (cached result) and rich text; hides hidden sheets", async () => {
    const wb = new ExcelJS.Workbook();
    const a = wb.addWorksheet("Roster");
    a.addRow(["Name", "Class", "Birth", "Calc"]);
    a.addRow(["Jordan Smith", 2031, new Date(Date.UTC(2012, 3, 18)), { formula: "1+1", result: 2 }]);
    a.addRow(["Rich", 2030, null, { richText: [{ text: "Hel" }, { text: "lo" }] }]);
    const b = wb.addWorksheet("Other");
    b.addRow(["X"]);
    b.addRow(["1"]);
    const hidden = wb.addWorksheet("Hidden");
    hidden.state = "hidden";
    hidden.addRow(["secret"]);
    const buf = new Uint8Array(await wb.xlsx.writeBuffer());
    const res = await parseSpreadsheet(buf, "book.xlsx");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.sheets.map((s) => s.name)).toEqual(["Roster", "Other"]);
    expect(res.sheets[0].rows[0]).toEqual(["Jordan Smith", "2031", "2012-04-18", "2"]);
    expect(res.sheets[0].rows[1][3]).toBe("Hello");
  });
});

describe("auto-detect mapping", () => {
  it("maps common headers and does not reuse a header", () => {
    const m = autoDetectMapping(["Athlete ID", "First Name", "Last Name", "Grad Year", "Pos", "Team Name", "Parent Email", "Ht", "Wt", "DOB", "Notes"], "athletes");
    expect(m).toMatchObject({ external_id: "Athlete ID", first_name: "First Name", last_name: "Last Name", graduation_year: "Grad Year", primary_position: "Pos", team: "Team Name", parent_email: "Parent Email", height: "Ht", weight: "Wt", birth_date: "DOB" });
    expect(Object.values(m)).not.toContain("Notes");
    expect(m.full_name).toBeUndefined();
  });
  it("uses a single Name column as full name", () => {
    expect(autoDetectMapping(["Name", "Class"], "athletes")).toMatchObject({ full_name: "Name", graduation_year: "Class" });
  });
  it("detects test columns for results", () => {
    const tests = [{ slug: "forty_yard_dash", name: "40-Yard Dash" }, { slug: "ten_yard_split", name: "10-Yard Split" }, { slug: "shuttle_5_10_5", name: "5-10-5 Shuttle" }, { slug: "vertical_jump", name: "Vertical Jump" }, { slug: "broad_jump", name: "Broad Jump" }];
    const m = autoDetectMapping(["First", "Last", "40", "10 Split", "5-10-5", "Vert", "Broad"], "combine_results", tests);
    expect(m).toMatchObject({ "test:forty_yard_dash": "40", "test:ten_yard_split": "10 Split", "test:shuttle_5_10_5": "5-10-5", "test:vertical_jump": "Vert", "test:broad_jump": "Broad" });
  });
});

describe("value parsers", () => {
  it("heights", () => {
    expect(parseHeightInches(`5'10"`)).toBe(70);
    expect(parseHeightInches("5-10")).toBe(70);
    expect(parseHeightInches("5 ft 6 in")).toBe(66);
    expect(parseHeightInches("68")).toBe(68);
    expect(parseHeightInches("5.10")).toBeNull();
    expect(parseHeightInches("abc")).toBeNull();
    expect(parseHeightInches("12")).toBeNull();
  });
  it("dates", () => {
    expect(parseDate("2012-04-18")).toBe("2012-04-18");
    expect(parseDate("4/18/2012")).toBe("2012-04-18");
    expect(parseDate("2/30/2012")).toBeNull();
    expect(parseDate("nope")).toBeNull();
  });
  it("class, position, state, names", () => {
    expect(parseGraduationYear("Class of 2031")).toBe(2031);
    expect(parseGraduationYear("'31")).toBe(2031);
    expect(parseGraduationYear("1999")).toBeNull();
    expect(parsePosition("Wide Receiver")).toBe("WR");
    expect(parsePosition("qb")).toBe("QB");
    expect(parsePosition("goalie")).toBeNull();
    expect(parseState("New Jersey")).toBe("NJ");
    expect(parseState("nj")).toBe("NJ");
    expect(splitFullName("Smith, Jordan")).toEqual({ first: "Jordan", last: "Smith" });
    expect(splitFullName("Jordan Van Dyke")).toEqual({ first: "Jordan", last: "Van Dyke" });
    expect(splitFullName("Cher")).toBeNull();
  });
  it("measurements", () => {
    expect(parseMeasurement("4.85s", "s")).toBe(4.85);
    expect(parseMeasurement(`9'6"`, "in")).toBe(114);
    expect(parseMeasurement("24.5", "in")).toBe(24.5);
    expect(parseMeasurement("fast", "s")).toBeNull();
  });
});

describe("athlete row normalization", () => {
  const mapping = { first_name: "F", last_name: "L", graduation_year: "C", primary_position: "P", height: "H", parent_email: "E", birth_date: "B", highlight_urls: "V" };
  it("normalizes valid data and drops bad optional values with warnings", () => {
    const r = normalizeAthleteRow({ F: "Jordan", L: "Smith", C: "2031", P: "wr", H: `5'6"`, E: "BAD", B: "4/18/2012", V: "https://youtu.be/x http://insecure.test" }, mapping);
    expect(r.errors).toEqual([]);
    expect(r.normalized).toMatchObject({ first_name: "Jordan", last_name: "Smith", graduation_year: 2031, primary_position: "WR", height_in: 66, birth_date: "2012-04-18" });
    expect(r.normalized.parent_email).toBeUndefined();
    expect(r.normalized.highlight_urls).toEqual(["https://youtu.be/x"]);
    expect(r.warnings.length).toBe(2);
  });
  it("errors when names are missing", () => {
    expect(normalizeAthleteRow({ F: "", L: "Smith" }, mapping).errors.length).toBe(1);
  });
});

const TESTS = [
  { slug: "forty_yard_dash", name: "40-Yard Dash", unit: "s", min_value: 3.5, max_value: 12 },
  { slug: "broad_jump", name: "Broad Jump", unit: "in", min_value: 30, max_value: 180 },
];
describe("result row normalization", () => {
  const mapping = { first_name: "F", last_name: "L", "test:forty_yard_dash": "40", "test:broad_jump": "BJ", protocol: "P" };
  it("parses values and protocol", () => {
    const r = normalizeResultRow({ F: "A", L: "B", "40": "5.2", BJ: `7'2"`, P: "Laser" }, mapping, TESTS);
    expect(r.errors).toEqual([]);
    expect(r.normalized.results).toEqual([
      { test_slug: "forty_yard_dash", value: 5.2, attempt: 1, protocol: "laser", tested_on: null },
      { test_slug: "broad_jump", value: 86, attempt: 1, protocol: "laser", tested_on: null },
    ]);
  });
  it("rejects implausible and non-numeric values", () => {
    const r = normalizeResultRow({ F: "A", L: "B", "40": "1.2", BJ: "far" }, mapping, TESTS);
    expect(r.errors.length).toBe(2);
  });
  it("does not require names when an external id is mapped", () => {
    const r = normalizeResultRow({ ID: "X1", "40": "5.2" }, { external_id: "ID", "test:forty_yard_dash": "40" }, TESTS);
    expect(r.errors).toEqual([]);
  });
});

describe("import preview and duplicate detection", () => {
  const existing: MatchableAthlete[] = [
    { id: "11111111-1111-4111-8111-111111111111", first_name: "Jordan", last_name: "Smith", graduation_year: 2031, team: "Eagles", parent_email: "p@example.com", external_ids: [{ source_system: "sheet", external_id: "A1" }] },
    { id: "22222222-2222-4222-8222-222222222222", first_name: "Casey", last_name: "Jones", graduation_year: 2030, team: "Hawks", parent_email: null, external_ids: [] },
  ];
  const mapping = { first_name: "F", last_name: "L", graduation_year: "C", team: "T", external_id: "X" };
  const rows = [
    { row_number: 2, raw: { F: "Jordan", L: "Smith", C: "2031", T: "Eagles", X: "" } },
    { row_number: 3, raw: { F: "Jordan", L: "Smith", C: "2031", T: "Eagles", X: "" } },
    { row_number: 4, raw: { F: "Casey", L: "Jones", C: "2030", T: "", X: "" } },
    { row_number: 5, raw: { F: "New", L: "Kid", C: "2032", T: "", X: "" } },
    { row_number: 6, raw: { F: "", L: "", C: "", T: "", X: "" } },
    { row_number: 7, raw: { F: "Anyone", L: "Else", C: "2031", T: "", X: "A1" } },
  ];
  const out = buildPreview({ kind: "athletes", rows, mapping, tests: [], athletes: existing, sourceSystem: "sheet" });
  const by = Object.fromEntries(out.rows.map((r) => [r.row_number, r]));
  it("auto-matches only with strong corroboration, otherwise flags for review", () => {
    expect(by[2]).toMatchObject({ match_status: "matched", matched_athlete_id: existing[0].id, decision: "link" });
    expect(by[3]).toMatchObject({ match_status: "duplicate_in_file", decision: "skip" });
  });
  it("never auto-merges a name+class match without team or email", () => {
    expect(by[4].match_status).toBe("ambiguous");
    expect(by[4].decision).toBeNull();
  });
  it("creates new athletes, flags in-file duplicates and invalid rows", () => {
    expect(by[5]).toMatchObject({ match_status: "new", decision: "create" });
    expect(by[6].match_status).toBe("invalid");
  });
  it("matches by external id regardless of name", () => {
    expect(by[7]).toMatchObject({ match_status: "matched", matched_athlete_id: existing[0].id, decision: "link" });
  });
  it("summarises counts", () => {
    expect(out.summary.total).toBe(6);
    expect(out.summary.invalid).toBe(1);
  });
  it("result imports never create athletes", () => {
    const res = buildPreview({ kind: "combine_results", rows: [{ row_number: 2, raw: { F: "Nobody", L: "Here", "40": "5.0" } }], mapping: { first_name: "F", last_name: "L", "test:forty_yard_dash": "40" }, tests: TESTS, athletes: existing, sourceSystem: "sheet" });
    expect(res.rows[0]).toMatchObject({ match_status: "new", decision: "skip" });
  });
});
