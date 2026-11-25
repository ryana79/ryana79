import { beforeAll, describe, expect, it } from "vitest";
import { addUser, as, createDb, type Db } from "./harness";

type User = { id: string; email: string };

let db: Db;
let owner: User, admin: User, editor: User, coach: User, parent: User;

const insertEvent = (slug: string, status = "published", extra = "") =>
  db.query(`insert into public.events (slug, title, status, event_date ${extra ? "," + extra.split("=")[0] : ""}) values ($1, $2, $3, '2027-05-16' ${extra ? "," + extra.split("=")[1] : ""}) returning id`, [slug, slug.toUpperCase(), status]);

async function athlete(first: string, last: string, opts: { grade?: number; birth?: string; grad?: number } = {}): Promise<string> {
  const res = await db.query<{ id: string }>("insert into public.athletes (first_name, last_name, graduation_year, current_grade) values ($1, $2, $3, $4) returning id", [first, last, opts.grad ?? 2031, opts.grade ?? 9]);
  const id = res.rows[0].id;
  if (opts.birth) await db.query("insert into public.athlete_private (athlete_id, birth_date, parent_email) values ($1, current_date - $2::interval, 'parent@example.com')", [id, opts.birth]);
  return id;
}

async function consent(athleteId: string, by: User, vpc = false) {
  await as(db, by, () =>
    db.query("insert into public.athlete_consents (athlete_id, status, guardian_name, method, verifiable_parental_consent, recorded_by) values ($1, 'granted', 'G. Guardian', 'signed_form', $2, $3)", [athleteId, vpc, by.id]),
  );
}

beforeAll(async () => {
  db = await createDb();
  owner = await addUser(db, "owner@example.com", ["owner"]);
  admin = await addUser(db, "admin@example.com", ["admin"]);
  editor = await addUser(db, "editor@example.com", ["editor"]);
  coach = await addUser(db, "coach@example.com", ["coach"]);
  parent = await addUser(db, "parent@example.com", ["parent"]);
});

describe("anonymous and low-privilege access", () => {
  it("shows anon only published or archived events, never drafts", async () => {
    await insertEvent("public-combine");
    await insertEvent("secret-draft", "draft");
    const rows = await as(db, null, () => db.query<{ slug: string }>("select slug from public.events order by slug"));
    expect(rows.rows.map((r) => r.slug)).toEqual(["public-combine"]);
  });

  it("denies anon any access to private tables", async () => {
    for (const table of ["athlete_private", "event_registrations", "import_rows", "athlete_consents", "audit_logs", "user_roles", "inquiries"]) {
      await expect(as(db, null, () => db.query(`select * from public.${table}`)), table).rejects.toThrow(/permission denied/);
    }
  });

  it("denies anon writes to public tables", async () => {
    await expect(as(db, null, () => db.query("insert into public.sponsors (name) values ('x')"))).rejects.toThrow(/permission denied/);
    await expect(as(db, null, () => db.query("update public.events set title = 'hacked'"))).rejects.toThrow(/permission denied/);
  });

  it("lets anon submit inquiries and privacy requests but never read them back", async () => {
    await as(db, null, () => db.query("insert into public.inquiries (kind, name, email, message) values ('contact', 'Visitor', 'visitor@example.com', 'hello')"));
    await expect(as(db, null, () => db.query("select * from public.inquiries"))).rejects.toThrow(/permission denied/);
    await expect(as(db, null, () => db.query("insert into public.inquiries (kind, name, email) values ('contact', 'Bad', 'not-an-email')"))).rejects.toThrow(/email/);
    const seen = await as(db, editor, () => db.query("select * from public.inquiries"));
    expect(seen.rows).toHaveLength(0);
    const admins = await as(db, admin, () => db.query("select * from public.inquiries"));
    expect(admins.rows).toHaveLength(1);
  });

  it("does not let a parent or coach read staff-only data", async () => {
    const roles = await as(db, parent, () => db.query<{ user_id: string }>("select * from public.user_roles"));
    expect(roles.rows.every((r) => r.user_id === parent.id)).toBe(true);
    const audit = await as(db, coach, () => db.query("select * from public.audit_logs"));
    expect(audit.rows).toHaveLength(0);
    const priv = await as(db, coach, () => db.query("select * from public.athlete_private"));
    expect(priv.rows).toHaveLength(0);
  });
});

describe("event CRUD authorization", () => {
  it("allows editors to create and update events but not delete them", async () => {
    const id = await as(db, editor, async () => {
      const r = await db.query<{ id: string }>("insert into public.events (slug, title, status, event_date) values ('editor-event', 'Editor Event', 'draft', '2027-06-01') returning id");
      return r.rows[0].id;
    });
    await as(db, editor, () => db.query("update public.events set title = 'Renamed' where id = $1", [id]));
    const del = await as(db, editor, () => db.query("delete from public.events where id = $1 returning id", [id]));
    expect(del.rows).toHaveLength(0);
    const still = await db.query("select title from public.events where id = $1", [id]);
    expect(still.rows[0]).toMatchObject({ title: "Renamed" });
  });

  it("blocks coaches from creating events", async () => {
    await expect(as(db, coach, () => db.query("insert into public.events (slug, title) values ('coach-event', 'x')"))).rejects.toThrow(/row-level security/);
  });

  it("lets admins delete events and stamps published_at on publish", async () => {
    const r = await db.query<{ id: string }>("insert into public.events (slug, title, status, event_date) values ('to-delete', 'Delete me', 'draft', '2027-07-01') returning id");
    const id = r.rows[0].id;
    await as(db, admin, () => db.query("update public.events set status = 'published' where id = $1", [id]));
    const pub = await db.query<{ published_at: string | null }>("select published_at from public.events where id = $1", [id]);
    expect(pub.rows[0].published_at).not.toBeNull();
    const del = await as(db, admin, () => db.query("delete from public.events where id = $1 returning id", [id]));
    expect(del.rows).toHaveLength(1);
  });

  it("rejects publishing an event without a date and non-Jotform embed URLs", async () => {
    await expect(db.query("insert into public.events (slug, title, status) values ('no-date', 'x', 'published')")).rejects.toThrow(/events_published_needs_date/);
    await expect(db.query("insert into public.events (slug, title, jotform_url) values ('bad-url', 'x', 'https://evil.example.com/form')")).rejects.toThrow(/jotform_url/);
  });

  it("prevents two events from claiming the same Jotform form", async () => {
    await db.query("insert into public.events (slug, title, jotform_form_id) values ('form-a', 'A', '123456789012')");
    await expect(db.query("insert into public.events (slug, title, jotform_form_id) values ('form-b', 'B', '123456789012')")).rejects.toThrow(/events_form_idx|duplicate key/);
  });
});

describe("roles and audit", () => {
  it("lets only owners grant roles", async () => {
    const target = await addUser(db, "target@example.com");
    await expect(as(db, admin, () => db.query("insert into public.user_roles (user_id, role) values ($1, 'admin')", [target.id]))).rejects.toThrow(/row-level security/);
    await as(db, owner, () => db.query("insert into public.user_roles (user_id, role, granted_by) values ($1, 'editor', $2)", [target.id, owner.id]));
    const audit = await db.query("select * from public.audit_logs where entity_type = 'user_roles' and entity_id = $1", [target.id]);
    expect(audit.rows.length).toBeGreaterThan(0);
  });

  it("refuses to remove the last owner", async () => {
    await expect(as(db, owner, () => db.query("delete from public.user_roles where user_id = $1 and role = 'owner'", [owner.id]))).rejects.toThrow(/last owner/);
  });

  it("blocks non-staff users from forging audit entries", async () => {
    await expect(as(db, parent, () => db.query("select public.write_audit('fake', 'x', '1')"))).rejects.toThrow(/Not permitted/);
    await expect(as(db, null, () => db.query("select public.write_audit('fake', 'x', '1')"))).rejects.toThrow(/permission denied/);
    await as(db, admin, () => db.query("select public.write_audit('real_event', 'x', '1')"));
  });

  it("audit logs are admin-readable only and record changed column names, not values", async () => {
    await as(db, admin, () => db.query("update public.events set summary = 'secret-summary-text' where slug = 'public-combine'"));
    const rows = await as(db, admin, () => db.query<{ metadata: unknown; changed_fields: string[] | null; summary: string | null }>("select * from public.audit_logs where entity_type = 'events' and action = 'update' order by created_at desc limit 1"));
    expect(JSON.stringify(rows.rows[0])).not.toContain("secret-summary-text");
    expect(rows.rows[0].changed_fields).toContain("summary");
    const asEditor = await as(db, editor, () => db.query("select * from public.audit_logs"));
    expect(asEditor.rows).toHaveLength(0);
  });
});

describe("athlete publication, consent and youth privacy", () => {
  it("cannot approve a profile without granted consent", async () => {
    const id = await athlete("No", "Consent", { birth: "15 years" });
    await expect(as(db, admin, () => db.query("update public.athletes set profile_status = 'approved', public_visibility = true where id = $1", [id]))).rejects.toThrow(/granted parental\/guardian consent/);
  });

  it("only admins can approve, even with consent", async () => {
    const id = await athlete("Edit", "Approve", { birth: "15 years" });
    await consent(id, admin);
    const res = await as(db, editor, () => db.query("update public.athletes set profile_status = 'approved', public_visibility = true where id = $1", [id]).catch(() => null));
    expect(res?.rowCount ?? 0).toBe(0);
    const after = await db.query<{ profile_status: string }>("select profile_status from public.athletes where id = $1", [id]);
    expect(after.rows[0].profile_status).toBe("draft");
  });

  it("publishes an over-13 athlete with consent and exposes only public fields to anon", async () => {
    const id = await athlete("Pat", "Public", { birth: "15 years" });
    await consent(id, admin);
    await as(db, admin, () => db.query("update public.athletes set profile_status = 'approved', public_visibility = true where id = $1", [id]));
    const visible = await as(db, null, () => db.query<{ id: string }>("select id from public.athletes where id = $1", [id]));
    expect(visible.rows).toHaveLength(1);
    await expect(as(db, null, () => db.query("select birth_date from public.athlete_private"))).rejects.toThrow(/permission denied/);
  });

  it("hides unapproved athletes from anon", async () => {
    const id = await athlete("Hidden", "Draft", { birth: "15 years" });
    const rows = await as(db, null, () => db.query("select id from public.athletes where id = $1", [id]));
    expect(rows.rows).toHaveLength(0);
  });

  it("blocks publishing under-13 and unknown-age athletes until the COPPA workflow is approved", async () => {
    const young = await athlete("Young", "Player", { birth: "11 years", grade: 6 });
    await consent(young, admin, true);
    await expect(as(db, admin, () => db.query("update public.athletes set profile_status = 'approved', public_visibility = true where id = $1", [young]))).rejects.toThrow(/under 13/);

    const unknownRes = await db.query<{ id: string }>("insert into public.athletes (first_name, last_name) values ('Unknown', 'Age') returning id");
    await consent(unknownRes.rows[0].id, admin, true);
    await expect(as(db, admin, () => db.query("update public.athletes set profile_status = 'approved', public_visibility = true where id = $1", [unknownRes.rows[0].id]))).rejects.toThrow(/under 13/);
  });

  it("only the owner can enable the COPPA workflow, which still needs verifiable consent", async () => {
    const young = await athlete("Coppa", "Child", { birth: "11 years", grade: 6 });
    await consent(young, admin, false);
    const denied = await as(db, admin, () => db.query("update public.site_settings set value = '{\"workflow_approved\": true}' where key = 'coppa'"));
    expect(denied.rowCount).toBe(0);
    await as(db, owner, () => db.query("update public.site_settings set value = '{\"workflow_approved\": true}' where key = 'coppa'"));
    try {
      await expect(as(db, admin, () => db.query("update public.athletes set profile_status = 'approved', public_visibility = true where id = $1", [young]))).rejects.toThrow(/under 13/);
      await consent(young, admin, true);
      await as(db, admin, () => db.query("update public.athletes set profile_status = 'approved', public_visibility = true where id = $1", [young]));
    } finally {
      await db.query("update public.site_settings set value = '{\"workflow_approved\": false}' where key = 'coppa'");
    }
  });

  it("withdrawing consent immediately unpublishes the profile", async () => {
    const id = await athlete("With", "Draw", { birth: "16 years" });
    await consent(id, admin);
    await as(db, admin, () => db.query("update public.athletes set profile_status = 'approved', public_visibility = true where id = $1", [id]));
    await as(db, admin, () => db.query("insert into public.athlete_consents (athlete_id, status, guardian_name, recorded_by) values ($1, 'withdrawn', 'G. Guardian', $2)", [id, admin.id]));
    const row = await db.query<{ public_visibility: boolean; profile_status: string; consent_status: string }>("select public_visibility, profile_status, consent_status from public.athletes where id = $1", [id]);
    expect(row.rows[0].public_visibility).toBe(false);
    expect(row.rows[0].consent_status).toBe("withdrawn");
    const anon = await as(db, null, () => db.query("select id from public.athletes where id = $1", [id]));
    expect(anon.rows).toHaveLength(0);
  });

  it("makes the consent trail append-only", async () => {
    const id = await athlete("Trail", "Keep", { birth: "16 years" });
    await consent(id, admin);
    await expect(db.query("update public.athlete_consents set status = 'declined' where athlete_id = $1", [id])).rejects.toThrow(/append-only/);
    const del = await as(db, admin, () => db.query("delete from public.athlete_consents where athlete_id = $1", [id]));
    expect(del.rowCount).toBe(0);
    await expect(db.query("delete from public.audit_logs")).rejects.toThrow(/append-only/);
  });
});

describe("combine results integrity", () => {
  let eventId: string;
  let publicAthlete: string;
  let draftAthlete: string;
  let testType: string;

  beforeAll(async () => {
    const ev = await db.query<{ id: string }>("select id from public.events where slug = 'public-combine'");
    eventId = ev.rows[0].id;
    publicAthlete = (await db.query<{ id: string }>("select id from public.athletes where last_name = 'Public'")).rows[0].id;
    draftAthlete = (await db.query<{ id: string }>("select id from public.athletes where last_name = 'Draft'")).rows[0].id;
    testType = (await db.query<{ id: string }>("select id from public.combine_test_types where slug = 'forty_yard_dash'")).rows[0].id;
  });

  const addResult = (who: User, athleteId: string, value: number, status = "unverified", attempt = 1) =>
    as(db, who, () =>
      db.query<{ id: string }>("insert into public.combine_results (athlete_id, event_id, test_type_id, value, unit, attempt_number, verification_status, protocol) values ($1, $2, $3, $4, 'x', $5, $6, 'laser') returning id", [athleteId, eventId, testType, value, attempt, status]),
    );

  it("rejects implausible values and normalizes the unit from the test type", async () => {
    await expect(addResult(admin, publicAthlete, 1.2)).rejects.toThrow(/outside the plausible range/);
    const r = await addResult(admin, publicAthlete, 5.5);
    const row = await db.query<{ unit: string; verification_status: string }>("select unit, verification_status from public.combine_results where id = $1", [r.rows[0].id]);
    expect(row.rows[0]).toEqual({ unit: "s", verification_status: "unverified" });
  });

  it("only admins can insert verified results or verify existing ones", async () => {
    await expect(addResult(editor, publicAthlete, 5.4, "verified", 2)).rejects.toThrow(/row-level security|Only an admin/);
    const r = await addResult(coach, publicAthlete, 5.4, "unverified", 3).catch(() => null);
    if (r) await expect(as(db, coach, () => db.query("update public.combine_results set verification_status = 'verified' where id = $1", [r.rows[0].id]))).rejects.toThrow(/Only an admin|row-level security/);
  });

  it("keeps measurements immutable and corrects by superseding", async () => {
    const r = await addResult(admin, publicAthlete, 5.6, "unverified", 4);
    const id = r.rows[0].id;
    await expect(db.query("update public.combine_results set value = 4.0 where id = $1", [id])).rejects.toThrow(/immutable/);
    const fixed = await as(db, admin, () => db.query<{ correct_combine_result: string }>("select public.correct_combine_result($1, 5.55, 'typo') as correct_combine_result", [id]));
    const newId = fixed.rows[0].correct_combine_result;
    const old = await db.query<{ is_current: boolean }>("select is_current from public.combine_results where id = $1", [id]);
    const next = await db.query<{ supersedes_id: string; verification_status: string; value: string }>("select supersedes_id, verification_status, value from public.combine_results where id = $1", [newId]);
    expect(old.rows[0].is_current).toBe(false);
    expect(next.rows[0]).toMatchObject({ supersedes_id: id, verification_status: "unverified", value: "5.550" });
  });

  it("exposes to anon only current, verified results of public athletes", async () => {
    await db.query("delete from public.combine_results");
    const publicVerified = await addResult(admin, publicAthlete, 5.2, "verified");
    await addResult(admin, publicAthlete, 5.1, "unverified", 2);
    await addResult(admin, draftAthlete, 4.9, "verified");
    const visible = await as(db, null, () => db.query<{ id: string }>("select id from public.combine_results"));
    expect(visible.rows.map((r) => r.id)).toEqual([publicVerified.rows[0].id]);
    const superseded = await as(db, admin, () => db.query<{ correct_combine_result: string }>("select public.correct_combine_result($1, 5.25) as correct_combine_result", [publicVerified.rows[0].id]));
    expect(superseded.rows).toHaveLength(1);
    const afterCorrection = await as(db, null, () => db.query("select id from public.combine_results"));
    expect(afterCorrection.rows).toHaveLength(0);
  });
});

describe("spreadsheet import apply", () => {
  async function batch(kind: "athletes" | "combine_results", rows: Array<{ normalized: Record<string, unknown>; match_status?: string; decision?: string | null; matched?: string | null }>, eventId: string | null = null) {
    const b = await db.query<{ id: string }>("insert into public.import_batches (kind, status, event_id, source_system, created_by) values ($1, 'previewed', $2, 'sheet-test', $3) returning id", [kind, eventId, admin.id]);
    const id = b.rows[0].id;
    let n = 1;
    for (const r of rows) {
      await db.query("insert into public.import_rows (batch_id, row_number, normalized, match_status, decision, matched_athlete_id) values ($1, $2, $3, $4, $5, $6)", [id, n++, JSON.stringify(r.normalized), r.match_status ?? "new", r.decision ?? null, r.matched ?? null]);
    }
    return id;
  }
  const apply = (who: User, id: string, mode: string, overwrite = false) =>
    as(db, who, () => db.query<{ r: Record<string, number> }>("select public.apply_import_batch($1, $2, $3) as r", [id, mode, overwrite]));

  it("creates new athletes as draft with no consent and links external ids", async () => {
    const id = await batch("athletes", [{ normalized: { first_name: "Import", last_name: "One", graduation_year: 2031, external_id: "X1", parent_email: "p@example.com", birth_date: "2012-05-05" }, decision: "create" }]);
    const res = await apply(admin, id, "add_and_update");
    expect(res.rows[0].r).toMatchObject({ created: 1, updated: 0, failed: 0 });
    const a = await db.query<{ profile_status: string; consent_status: string; public_visibility: boolean }>("select profile_status, consent_status, public_visibility from public.athletes where last_name = 'One'");
    expect(a.rows[0]).toEqual({ profile_status: "draft", consent_status: "none", public_visibility: false });
    const m = await db.query("select * from public.external_record_mappings where external_id = 'X1'");
    expect(m.rows).toHaveLength(1);
  });

  it("skips rows without a decision and never auto-merges ambiguous matches", async () => {
    const before = await db.query<{ n: number }>("select count(*)::int as n from public.athletes");
    const id = await batch("athletes", [{ normalized: { first_name: "Import", last_name: "One", graduation_year: 2031 }, match_status: "ambiguous" }]);
    const res = await apply(admin, id, "add_and_update");
    expect(res.rows[0].r).toMatchObject({ created: 0, updated: 0, skipped: 1 });
    const after = await db.query<{ n: number }>("select count(*)::int as n from public.athletes");
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });

  it("preserves approved profile data unless overwrite is allowed", async () => {
    const approved = (await db.query<{ id: string }>("select id from public.athletes where last_name = 'Public'")).rows[0].id;
    await db.query("update public.athletes set team = 'Original Team', bio = null where id = $1", [approved]);
    const link = { normalized: { first_name: "Pat", last_name: "Public", team: "New Team", bio: "Imported bio" }, decision: "link", match_status: "matched", matched: approved };
    await apply(admin, await batch("athletes", [link]), "add_and_update");
    const kept = await db.query<{ team: string; bio: string | null }>("select team, bio from public.athletes where id = $1", [approved]);
    expect(kept.rows[0]).toEqual({ team: "Original Team", bio: "Imported bio" });
    await apply(admin, await batch("athletes", [link]), "add_and_update", true);
    const replaced = await db.query<{ team: string }>("select team from public.athletes where id = $1", [approved]);
    expect(replaced.rows[0].team).toBe("New Team");
    const stillPublic = await db.query<{ public_visibility: boolean }>("select public_visibility from public.athletes where id = $1", [approved]);
    expect(stillPublic.rows[0].public_visibility).toBe(true);
  });

  it("honours add-new and update-matched modes", async () => {
    const one = (await db.query<{ id: string }>("select id from public.athletes where last_name = 'One'")).rows[0].id;
    const rows = [
      { normalized: { first_name: "Mode", last_name: "New", graduation_year: 2030 }, decision: "create" },
      { normalized: { first_name: "Import", last_name: "One", team: "Linked Team" }, decision: "link", match_status: "matched", matched: one },
    ];
    const addNew = await apply(admin, await batch("athletes", rows), "add_new");
    expect(addNew.rows[0].r).toMatchObject({ created: 1, updated: 0, skipped: 1 });
    const updOnly = await apply(admin, await batch("athletes", [{ ...rows[0], normalized: { first_name: "Mode", last_name: "Never", graduation_year: 2030 } }, rows[1]]), "update_matched");
    expect(updOnly.rows[0].r).toMatchObject({ created: 0, updated: 1, skipped: 1 });
    expect((await db.query("select 1 from public.athletes where last_name = 'Never'")).rows).toHaveLength(0);
  });

  it("applies preview-only without changing data and refuses to apply a batch twice", async () => {
    const id = await batch("athletes", [{ normalized: { first_name: "Dry", last_name: "Run", graduation_year: 2031 }, decision: "create" }]);
    await apply(admin, id, "preview_only");
    expect((await db.query("select 1 from public.athletes where last_name = 'Run'")).rows).toHaveLength(0);
    await apply(admin, id, "add_and_update");
    await expect(apply(admin, id, "add_and_update")).rejects.toThrow(/already been applied/);
  });

  it("restricts imports to admins", async () => {
    const id = await batch("athletes", [{ normalized: { first_name: "No", last_name: "Access", graduation_year: 2031 }, decision: "create" }]);
    await expect(apply(editor, id, "add_and_update")).rejects.toThrow(/Only an admin/);
    await expect(as(db, editor, () => db.query("select * from public.import_rows"))).resolves.toMatchObject({ rows: [] });
  });

  it("imports combine results as unverified and counts failures per row", async () => {
    const eventId = (await db.query<{ id: string }>("select id from public.events where slug = 'public-combine'")).rows[0].id;
    const athleteId = (await db.query<{ id: string }>("select id from public.athletes where last_name = 'One'")).rows[0].id;
    const id = await batch(
      "combine_results",
      [
        { normalized: { results: [{ test_slug: "forty_yard_dash", value: 5.5, protocol: "laser" }, { test_slug: "vertical_jump", value: 24 }] }, decision: "link", match_status: "matched", matched: athleteId },
        { normalized: { results: [{ test_slug: "forty_yard_dash", value: 1.1 }] }, decision: "link", match_status: "matched", matched: athleteId },
      ],
      eventId,
    );
    const res = await apply(admin, id, "add_and_update");
    expect(res.rows[0].r).toMatchObject({ created: 1, failed: 1 });
    const rows = await db.query<{ verification_status: string; source: string }>("select verification_status, source from public.combine_results where import_batch_id = $1", [id]);
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows.every((r) => r.verification_status === "unverified" && r.source === "import")).toBe(true);
  });
});

describe("registrations and erasure", () => {
  it("dedupes Jotform submissions at the database level", async () => {
    const eventId = (await db.query<{ id: string }>("select id from public.events where slug = 'public-combine'")).rows[0].id;
    const insert = () => as(db, "service", () => db.query("insert into public.event_registrations (event_id, jotform_submission_id, jotform_form_id) values ($1, '5555', '123456789012')", [eventId]));
    await insert();
    await expect(insert()).rejects.toThrow(/duplicate key|unique/);
    const reg = await db.query<{ payment_status: string }>("select payment_status from public.event_registrations where jotform_submission_id = '5555'");
    expect(reg.rows[0].payment_status).toBe("unverified");
  });

  it("keeps registrations unreadable to non-admins", async () => {
    const asEditor = await as(db, editor, () => db.query("select * from public.event_registrations"));
    expect(asEditor.rows).toHaveLength(0);
    const asAdmin = await as(db, admin, () => db.query("select * from public.event_registrations"));
    expect(asAdmin.rows.length).toBeGreaterThan(0);
  });

  it("erases an athlete and everything linked to them, leaving a content-free audit entry", async () => {
    const id = await athlete("Erase", "Me", { birth: "15 years" });
    await consent(id, admin);
    const eventId = (await db.query<{ id: string }>("select id from public.events where slug = 'public-combine'")).rows[0].id;
    const tt = (await db.query<{ id: string }>("select id from public.combine_test_types where slug = 'vertical_jump'")).rows[0].id;
    await db.query("insert into public.combine_results (athlete_id, event_id, test_type_id, value, unit) values ($1, $2, $3, 25, 'in')", [id, eventId, tt]);
    await db.query("insert into public.event_registrations (event_id, jotform_submission_id, jotform_form_id, athlete_id, parent_email) values ($1, 'erase-1', '123456789012', $2, 'erase@example.com')", [eventId, id]);

    await expect(as(db, editor, () => db.query("select public.erase_athlete($1)", [id]))).rejects.toThrow(/Only an admin/);
    await as(db, admin, () => db.query("select public.erase_athlete($1)", [id]));

    for (const [table, col] of [["athletes", "id"], ["athlete_private", "athlete_id"], ["athlete_consents", "athlete_id"], ["combine_results", "athlete_id"], ["event_registrations", "athlete_id"]] as const) {
      const left = await db.query(`select 1 from public.${table} where ${col} = $1`, [id]);
      expect(left.rows, table).toHaveLength(0);
    }
    const audit = await db.query<{ metadata: unknown; summary: string | null }>("select * from public.audit_logs where action = 'athlete_erased' and entity_id = $1", [id]);
    expect(audit.rows).toHaveLength(1);
    expect(JSON.stringify(audit.rows[0])).not.toContain("Erase");
  });
});
