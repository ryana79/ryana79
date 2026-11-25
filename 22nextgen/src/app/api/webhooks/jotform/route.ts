import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { serverSecrets } from "@/lib/env";
import { extractHints, extractRegistration, tokensMatch, validateApiBase, validateSubmission } from "@/lib/jotform-webhook";
import { matchAthlete, type MatchableAthlete } from "@/lib/matching";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY = 1_000_000;

type Outcome = "processed" | "duplicate" | "rejected" | "error";

async function parseBody(request: NextRequest): Promise<{ get(name: string): unknown } | null> {
  const len = Number(request.headers.get("content-length") ?? "0");
  if (len > MAX_BODY) return null;
  const type = request.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) {
      const text = await request.text();
      if (text.length > MAX_BODY) return null;
      const json = JSON.parse(text) as Record<string, unknown>;
      return { get: (n: string) => json?.[n] };
    }
    const fd = await request.formData();
    return { get: (n: string) => fd.get(n) };
  } catch {
    return null;
  }
}

/**
 * Jotform webhook. The request body is never trusted for data: only numeric formID/submissionID hints are read,
 * then the full submission is fetched server-side with our API key and checked against those hints.
 * Idempotent on jotform_submission_id. Athletes are never linked automatically; likely matches are queued for review.
 * Payment status is never set to verified here (no authorized payment source is integrated).
 */
export async function POST(request: NextRequest) {
  const secrets = serverSecrets();
  if (!secrets.jotformApiKey || !secrets.jotformWebhookSecret || !secrets.serviceRoleKey) {
    return NextResponse.json({ ok: false, error: "Webhook is not configured." }, { status: 503 });
  }
  const token = request.nextUrl.searchParams.get("token") ?? request.headers.get("x-webhook-token");
  if (!tokensMatch(token, secrets.jotformWebhookSecret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!validateApiBase(secrets.jotformApiBase)) {
    console.error("[jotform] JOTFORM_API_BASE is not an allowed Jotform host");
    return NextResponse.json({ ok: false, error: "Webhook is misconfigured." }, { status: 503 });
  }

  const body = await parseBody(request);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  const { submissionId, formId } = extractHints(body);
  if (!submissionId || !formId) return NextResponse.json({ ok: false, error: "Missing submission or form ID." }, { status: 400 });

  const supabase = createServiceClient();
  const log = async (outcome: Outcome, eventId: string | null, error?: string) => {
    await supabase.from("jotform_submissions").insert({ submission_id: submissionId, form_id: formId, event_id: eventId, outcome, error: error?.slice(0, 300) ?? null });
  };

  try {
    const { data: event } = await supabase.from("events").select("id").eq("jotform_form_id", formId).limit(1).maybeSingle();
    if (!event) {
      await log("rejected", null, "Form is not linked to any event");
      return NextResponse.json({ ok: true, status: "ignored" }, { status: 202 });
    }

    const { data: existing } = await supabase.from("event_registrations").select("id").eq("jotform_submission_id", submissionId).maybeSingle();
    if (existing) {
      await log("duplicate", event.id);
      return NextResponse.json({ ok: true, status: "duplicate" });
    }

    const res = await fetch(`${secrets.jotformApiBase}/submission/${submissionId}`, { headers: { APIKEY: secrets.jotformApiKey, Accept: "application/json" }, signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!res.ok) {
      await log("error", event.id, `Jotform API responded ${res.status}`);
      return NextResponse.json({ ok: false, error: "Could not fetch submission." }, { status: 502 });
    }
    const valid = validateSubmission(await res.json(), { submissionId, formId });
    if (!valid.ok) {
      await log("rejected", event.id, valid.reason);
      return NextResponse.json({ ok: false, error: "Submission rejected." }, { status: 422 });
    }
    const reg = extractRegistration(valid.submission);

    let candidates: string[] = [];
    if (reg.participant_last_name) {
      const { data } = await supabase.from("athletes").select("id, first_name, last_name, graduation_year, team, athlete_private(parent_email)").ilike("last_name", reg.participant_last_name.replace(/[%_\\]/g, "")).limit(50);
      const pool: MatchableAthlete[] = (data ?? []).map((a) => {
        const priv = Array.isArray(a.athlete_private) ? a.athlete_private[0] : a.athlete_private;
        return { id: a.id, first_name: a.first_name, last_name: a.last_name, graduation_year: a.graduation_year, team: a.team, parent_email: priv?.parent_email ?? null };
      });
      const outcome = matchAthlete({ first_name: reg.participant_first_name, last_name: reg.participant_last_name, graduation_year: reg.graduation_year, team: reg.team, parent_email: reg.parent_email }, pool);
      candidates = outcome.status === "new" ? [] : outcome.candidates.slice(0, 5).map((c) => c.athlete_id);
    }

    const { error } = await supabase.from("event_registrations").insert({
      event_id: event.id,
      jotform_submission_id: submissionId,
      jotform_form_id: formId,
      participant_first_name: reg.participant_first_name,
      participant_last_name: reg.participant_last_name,
      graduation_year: reg.graduation_year,
      grade: reg.grade,
      position: reg.position,
      team: reg.team,
      parent_name: reg.parent_name,
      parent_email: reg.parent_email,
      parent_phone: reg.parent_phone,
      answers: reg.answers,
      payment_status: "unverified",
      status: "received",
      review_status: "needs_review",
      candidate_athlete_ids: candidates,
      submitted_at: reg.submitted_at,
    });
    if (error) {
      if (error.code === "23505") {
        await log("duplicate", event.id);
        return NextResponse.json({ ok: true, status: "duplicate" });
      }
      await log("error", event.id, error.code ?? "insert failed");
      return NextResponse.json({ ok: false, error: "Could not store registration." }, { status: 500 });
    }
    await log("processed", event.id);
    return NextResponse.json({ ok: true, status: "processed" });
  } catch (e) {
    console.error("[jotform] webhook error", e instanceof Error ? e.message : "unknown");
    try {
      await log("error", null, "Unexpected error");
    } catch {
      /* logging must never mask the original failure */
    }
    return NextResponse.json({ ok: false, error: "Webhook failed." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method not allowed." }, { status: 405, headers: { Allow: "POST" } });
}
