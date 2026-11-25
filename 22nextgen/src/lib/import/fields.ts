import { normalizeName } from "@/lib/matching";

export type ImportKind = "athletes" | "combine_results";

export type FieldDef = { key: string; label: string; group: "identity" | "public" | "private" | "result" | "meta"; hint?: string; synonyms: string[] };

export const ATHLETE_FIELDS: FieldDef[] = [
  { key: "external_id", label: "External ID", group: "identity", hint: "Your source system's athlete ID. Used for re-imports.", synonyms: ["id", "athlete id", "player id", "external id", "record id", "athleteid", "playerid"] },
  { key: "athlete_id", label: "22 NEXT GEN athlete ID", group: "identity", hint: "Internal UUID from a previous export.", synonyms: ["22 next gen id", "nextgen id", "internal id", "uuid"] },
  { key: "first_name", label: "First name", group: "identity", synonyms: ["first name", "first", "firstname", "given name", "athlete first name", "player first name"] },
  { key: "last_name", label: "Last name", group: "identity", synonyms: ["last name", "last", "lastname", "surname", "family name", "athlete last name", "player last name"] },
  { key: "full_name", label: "Full name (split into first/last)", group: "identity", synonyms: ["name", "full name", "athlete", "athlete name", "player", "player name", "participant", "participant name"] },
  { key: "display_name", label: "Display name", group: "public", synonyms: ["display name", "nickname", "preferred name", "goes by"] },
  { key: "graduation_year", label: "Graduation class", group: "public", synonyms: ["class", "grad year", "graduation year", "grad class", "class of", "hs grad year", "graduation"] },
  { key: "current_grade", label: "Current grade", group: "public", synonyms: ["grade", "current grade", "school grade"] },
  { key: "primary_position", label: "Primary position", group: "public", synonyms: ["position", "primary position", "pos", "pos 1", "position 1"] },
  { key: "secondary_position", label: "Secondary position", group: "public", synonyms: ["secondary position", "position 2", "pos 2", "other position"] },
  { key: "team", label: "Team / club", group: "public", synonyms: ["team", "club", "team name", "organization", "program", "youth team"] },
  { key: "school_public", label: "School (public)", group: "public", hint: "Shown on the public profile. Map only if the family agreed.", synonyms: ["public school", "school public"] },
  { key: "town", label: "Town", group: "public", synonyms: ["town", "city", "hometown"] },
  { key: "state", label: "State", group: "public", synonyms: ["state", "st"] },
  { key: "region", label: "Region", group: "public", synonyms: ["region", "area"] },
  { key: "height", label: "Height", group: "public", hint: "5'10\", 5-10, or inches.", synonyms: ["height", "ht", "height in", "height inches"] },
  { key: "weight", label: "Weight (lb)", group: "public", synonyms: ["weight", "wt", "weight lb", "weight lbs", "weight pounds"] },
  { key: "highlight_urls", label: "Highlight links", group: "public", synonyms: ["highlights", "highlight", "highlight url", "highlight link", "hudl", "film", "video"] },
  { key: "awards", label: "Awards", group: "public", synonyms: ["awards", "honors"] },
  { key: "achievements", label: "Achievements", group: "public", synonyms: ["achievements", "accomplishments"] },
  { key: "bio", label: "Bio", group: "public", synonyms: ["bio", "about", "biography", "player bio"] },
  { key: "birth_date", label: "Birth date", group: "private", synonyms: ["birth date", "birthdate", "dob", "date of birth", "birthday"] },
  { key: "school", label: "School (private)", group: "private", synonyms: ["school", "school name", "high school", "middle school"] },
  { key: "parent_name", label: "Parent/guardian name", group: "private", synonyms: ["parent", "parent name", "guardian", "guardian name", "parent guardian name", "parent/guardian"] },
  { key: "parent_email", label: "Parent email", group: "private", synonyms: ["parent email", "guardian email", "email", "parent e-mail", "contact email"] },
  { key: "parent_phone", label: "Parent phone", group: "private", synonyms: ["parent phone", "guardian phone", "phone", "phone number", "parent cell", "contact phone", "cell"] },
];

export const RESULT_IDENTITY_FIELDS: FieldDef[] = ATHLETE_FIELDS.filter((f) => ["athlete_id", "external_id", "first_name", "last_name", "full_name", "graduation_year", "team", "parent_email"].includes(f.key));

export const RESULT_META_FIELDS: FieldDef[] = [
  { key: "protocol", label: "Timing protocol", group: "meta", hint: "e.g. laser, hand. Defaults to “standard”.", synonyms: ["protocol", "timing", "timing method", "timed by"] },
  { key: "tested_on", label: "Test date", group: "meta", synonyms: ["date", "test date", "tested on", "tested", "event date"] },
];

export const TEST_SYNONYMS: Record<string, string[]> = {
  forty_yard_dash: ["40", "40 yard", "40 yard dash", "40yd", "40 yd", "40yd dash", "forty", "40 time", "40 yard dash time"],
  ten_yard_split: ["10", "10 yard", "10 yard split", "10yd", "10 yd split", "10yd split", "10 split", "ten yard split"],
  shuttle_5_10_5: ["5 10 5", "5-10-5", "5105", "pro agility", "shuttle", "5 10 5 shuttle", "20 yard shuttle", "5-10-5 shuttle"],
  vertical_jump: ["vertical", "vertical jump", "vert", "vj", "vertical leap"],
  broad_jump: ["broad", "broad jump", "bj", "standing broad jump", "standing broad"],
};

export type TestTypeLite = { slug: string; name: string };
export type Mapping = Record<string, string | null>;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const squash = (s: string) => normalizeName(s);

/** Auto-detect a column mapping from header names. Each header is used at most once; exact matches win over fuzzy ones. */
export function autoDetectMapping(headers: string[], kind: ImportKind, testTypes: TestTypeLite[] = []): Mapping {
  const fields: { key: string; synonyms: string[] }[] =
    kind === "athletes"
      ? ATHLETE_FIELDS
      : [
          ...RESULT_IDENTITY_FIELDS,
          ...RESULT_META_FIELDS,
          ...testTypes.map((t) => ({ key: `test:${t.slug}`, synonyms: [...(TEST_SYNONYMS[t.slug] ?? []), t.name, t.slug.replace(/_/g, " ")] })),
        ];
  const mapping: Mapping = {};
  const used = new Set<string>();
  const normHeaders = headers.map((h) => ({ h, n: norm(h), s: squash(h) }));

  for (const pass of ["exact", "squash"] as const) {
    for (const f of fields) {
      if (mapping[f.key]) continue;
      const hit = normHeaders.find((nh) => !used.has(nh.h) && f.synonyms.some((syn) => (pass === "exact" ? norm(syn) === nh.n : squash(syn) === nh.s)));
      if (hit) {
        mapping[f.key] = hit.h;
        used.add(hit.h);
      }
    }
  }
  if (kind === "athletes" && mapping.full_name && mapping.first_name && mapping.last_name) delete mapping.full_name;
  if (kind === "athletes" && mapping.school && mapping.school_public === mapping.school) delete mapping.school_public;
  return mapping;
}

export function mappingFields(kind: ImportKind, testTypes: TestTypeLite[]): FieldDef[] {
  if (kind === "athletes") return ATHLETE_FIELDS;
  return [
    ...RESULT_IDENTITY_FIELDS,
    ...testTypes.map((t) => ({ key: `test:${t.slug}`, label: t.name, group: "result" as const, synonyms: [] })),
    ...RESULT_META_FIELDS,
  ];
}

export const ATHLETE_TEMPLATE_HEADERS = ["External ID", "First Name", "Last Name", "Graduation Class", "Grade", "Position", "Team", "Town", "State", "Height", "Weight", "Birth Date", "School", "Parent Name", "Parent Email", "Parent Phone"];
export const ATHLETE_TEMPLATE_EXAMPLE = ["ABC-1001", "Jordan", "Example", "2031", "8", "WR", "Example Eagles", "Newark", "NJ", "5'6\"", "128", "2012-04-18", "Example Middle School", "Pat Example", "parent@example.com", "555-0100"];
export const RESULT_TEMPLATE_HEADERS = ["External ID", "First Name", "Last Name", "Graduation Class", "Team", "40-Yard Dash", "10-Yard Split", "5-10-5 Shuttle", "Vertical Jump", "Broad Jump", "Protocol", "Test Date"];
export const RESULT_TEMPLATE_EXAMPLE = ["ABC-1001", "Jordan", "Example", "2031", "Example Eagles", "5.42", "1.88", "4.95", "24.5", "7'2\"", "laser", "2027-05-16"];
