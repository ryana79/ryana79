import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {};

/** Tiny in-memory stand-in for the service-role Supabase client (just the calls the webhook makes). */
function fakeClient() {
  return {
    from(table: string) {
      const rows = (tables[table] ??= []);
      const filters: Array<(r: Row) => boolean> = [];
      const api = {
        select: () => api,
        eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return api; },
        ilike: (col: string, val: string) => { filters.push((r) => String(r[col]).toLowerCase() === val.toLowerCase()); return api; },
        limit: () => api,
        maybeSingle: async () => ({ data: rows.find((r) => filters.every((f) => f(r))) ?? null, error: null }),
        then: (resolve: (v: unknown) => void) => resolve({ data: rows.filter((r) => filters.every((f) => f(r))), error: null }),
        insert: async (row: Row) => {
          if (table === "event_registrations" && rows.some((r) => r.jotform_submission_id === row.jotform_submission_id)) return { error: { code: "23505" } };
          rows.push({ ...row });
          return { error: null };
        },
      };
      return api;
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({ createServiceClient: () => fakeClient() }));

const FORM = "250123456789012";
const SUB = "5551234567890";
const jotformPayload = (over: Record<string, unknown> = {}) => ({
  responseCode: 200,
  content: {
    id: SUB, form_id: FORM, status: "ACTIVE", created_at: "2027-04-01 10:30:00",
    answers: {
      1: { type: "control_fullname", text: "Athlete name", answer: { first: "Jordan", last: "Smith" } },
      2: { type: "control_email", text: "Parent email", answer: "pat@example.com" },
      3: { type: "control_payment", text: "Payment", answer: { paid: "yes" } },
    },
    ...over,
  },
});

async function post(token: string | null, body: Record<string, string> = { submissionID: SUB, formID: FORM }, headers: Record<string, string> = {}) {
  const { POST } = await import("@/app/api/webhooks/jotform/route");
  const { NextRequest } = await import("next/server");
  const url = `http://localhost/api/webhooks/jotform${token ? `?token=${token}` : ""}`;
  const form = new URLSearchParams(body);
  return POST(new NextRequest(url, { method: "POST", body: form, headers: { "content-type": "application/x-www-form-urlencoded", ...headers } }));
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  tables.events = [{ id: "event-1", jotform_form_id: FORM }];
  tables.athletes = [{ id: "ath-1", first_name: "Jordan", last_name: "Smith", graduation_year: 2031, team: "Eagles", athlete_private: [{ parent_email: "pat@example.com" }] }];
  vi.stubEnv("JOTFORM_API_KEY", "key-123");
  vi.stubEnv("JOTFORM_WEBHOOK_SECRET", "hook-secret");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
  vi.stubEnv("JOTFORM_API_BASE", "https://api.jotform.com");
  fetchMock = vi.fn(async () => new Response(JSON.stringify(jotformPayload()), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("POST /api/webhooks/jotform", () => {
  it("refuses to run when secrets are not configured", async () => {
    vi.stubEnv("JOTFORM_API_KEY", "");
    expect((await post("hook-secret")).status).toBe(503);
  });

  it("rejects missing or wrong tokens without touching Jotform or the database", async () => {
    expect((await post(null)).status).toBe(401);
    expect((await post("wrong")).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(tables.event_registrations ?? []).toHaveLength(0);
  });

  it("accepts the token in a header too", async () => {
    const res = await post(null, undefined, { "x-webhook-token": "hook-secret" });
    expect(res.status).toBe(200);
  });

  it("fetches the submission server-side with the API key and stores an unverified, unlinked registration", async () => {
    const res = await post("hook-secret", { submissionID: SUB, formID: FORM, rawRequest: '{"q1_name":{"first":"Evil","last":"Payload"}}', "payment_status": "PAID" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, status: "processed" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`https://api.jotform.com/submission/${SUB}`);
    expect((init as RequestInit).headers).toMatchObject({ APIKEY: "key-123" });
    const reg = tables.event_registrations[0];
    expect(reg).toMatchObject({ event_id: "event-1", jotform_submission_id: SUB, participant_first_name: "Jordan", participant_last_name: "Smith", payment_status: "unverified", review_status: "needs_review" });
    expect(reg.athlete_id).toBeUndefined();
    expect(reg.candidate_athlete_ids).toEqual(["ath-1"]);
    expect(JSON.stringify(reg)).not.toMatch(/Evil|Payload|PAID/);
    expect(tables.jotform_submissions[0]).toMatchObject({ outcome: "processed", submission_id: SUB });
  });

  it("is idempotent: a redelivered submission is a duplicate and never refetched", async () => {
    await post("hook-secret");
    fetchMock.mockClear();
    const second = await post("hook-secret");
    expect(await second.json()).toMatchObject({ status: "duplicate" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(tables.event_registrations).toHaveLength(1);
    expect(tables.jotform_submissions.map((s) => s.outcome)).toEqual(["processed", "duplicate"]);
  });

  it("ignores forms that do not belong to any configured event", async () => {
    const res = await post("hook-secret", { submissionID: SUB, formID: "999999999999" });
    expect(res.status).toBe(202);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(tables.event_registrations ?? []).toHaveLength(0);
    expect(tables.jotform_submissions[0]).toMatchObject({ outcome: "rejected" });
  });

  it("rejects when Jotform returns a submission for a different form or id", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(jotformPayload({ form_id: "111111111111" })), { status: 200 }));
    expect((await post("hook-secret")).status).toBe(422);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(jotformPayload({ id: "1234567890" })), { status: 200 }));
    expect((await post("hook-secret")).status).toBe(422);
    expect(tables.event_registrations ?? []).toHaveLength(0);
  });

  it("reports a 502 when Jotform cannot be reached, without storing anything", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 500 }));
    expect((await post("hook-secret")).status).toBe(502);
    expect(tables.event_registrations ?? []).toHaveLength(0);
    expect(tables.jotform_submissions[0]).toMatchObject({ outcome: "error" });
  });

  it("refuses non-Jotform API bases (SSRF guard) and malformed hints", async () => {
    vi.stubEnv("JOTFORM_API_BASE", "https://evil.example.com");
    expect((await post("hook-secret")).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.stubEnv("JOTFORM_API_BASE", "https://api.jotform.com");
    expect((await post("hook-secret", { submissionID: "../x", formID: FORM })).status).toBe(400);
  });
});
