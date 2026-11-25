import { createHash, timingSafeEqual } from "node:crypto";

/** Constant-time secret comparison (hash first so lengths always match). */
export function tokensMatch(provided: string | null | undefined, expected: string | null | undefined): boolean {
  if (!provided || !expected) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

const NUMERIC_ID = /^\d{8,24}$/;

/** The webhook body is never trusted for data: only these two ID hints are read, and only if numeric. */
export function extractHints(fields: { get(name: string): unknown }): { submissionId: string | null; formId: string | null } {
  const pick = (name: string) => {
    const v = fields.get(name);
    return typeof v === "string" && NUMERIC_ID.test(v.trim()) ? v.trim() : null;
  };
  return { submissionId: pick("submissionID") ?? pick("submission_id"), formId: pick("formID") ?? pick("form_id") };
}

/** SSRF guard: the API base must be an https jotform.com host. */
export function validateApiBase(base: string): boolean {
  try {
    const u = new URL(base);
    return u.protocol === "https:" && /^(?:[a-z0-9-]+\.)*jotform\.(?:com|pro)$/i.test(u.hostname) && !u.username && !u.password;
  } catch {
    return false;
  }
}

export type JotformAnswer = { name?: string; text?: string; type?: string; answer?: unknown; prettyFormat?: string };
export type JotformSubmission = { id: string; form_id: string; status?: string; created_at?: string; answers?: Record<string, JotformAnswer> };

export function validateSubmission(payload: unknown, hints: { submissionId: string; formId: string }): { ok: true; submission: JotformSubmission } | { ok: false; reason: string } {
  const root = payload as { responseCode?: number; content?: JotformSubmission } | null;
  const c = root?.content;
  if (!root || root.responseCode !== 200 || !c || typeof c !== "object") return { ok: false, reason: "Submission could not be fetched from Jotform" };
  if (String(c.id) !== hints.submissionId) return { ok: false, reason: "Submission ID mismatch" };
  if (String(c.form_id) !== hints.formId) return { ok: false, reason: "Form ID mismatch" };
  if (c.status && ["DELETED", "ARCHIVED"].includes(String(c.status).toUpperCase())) return { ok: false, reason: "Submission is deleted or archived" };
  return { ok: true, submission: c };
}

const SKIP_TYPES = new Set(["control_fileupload", "control_signature", "control_widget", "control_payment", "control_stripe", "control_paypal", "control_paypalpro", "control_square", "control_authnet", "control_creditcard", "control_head", "control_text", "control_button", "control_pagebreak", "control_image", "control_captcha", "control_divider", "control_collapse", "control_spinner", "control_inline"]);
const SENSITIVE_LABEL = /ssn|social security|card|cvv|password|pin\b|medical|medication|allerg|insurance|diagnos|doctor|physician|health|disab|injur|religio|ethnic|race\b/i;

export type ExtractedRegistration = {
  participant_first_name: string | null;
  participant_last_name: string | null;
  graduation_year: number | null;
  grade: number | null;
  position: string | null;
  team: string | null;
  parent_name: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  answers: Record<string, string>;
  submitted_at: string | null;
};

export function answerText(a: unknown): string {
  if (a === null || a === undefined) return "";
  if (typeof a === "string") return a.trim();
  if (typeof a === "number" || typeof a === "boolean") return String(a);
  if (Array.isArray(a)) return a.map(answerText).filter(Boolean).join(", ");
  if (typeof a === "object") {
    const o = a as Record<string, unknown>;
    if ("first" in o || "last" in o) return [o.first, o.last].map(answerText).filter(Boolean).join(" ");
    if ("full" in o) return answerText(o.full);
    if ("year" in o && "month" in o && "day" in o) return `${o.year}-${String(o.month).padStart(2, "0")}-${String(o.day).padStart(2, "0")}`;
    return Object.values(o).map(answerText).filter(Boolean).join(" ");
  }
  return "";
}

const clean = (s: string, max: number) => s.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
const isParent = (label: string) => /parent|guardian|mother|father|mom|dad/i.test(label);

export function extractRegistration(sub: JotformSubmission): ExtractedRegistration {
  const out: ExtractedRegistration = { participant_first_name: null, participant_last_name: null, graduation_year: null, grade: null, position: null, team: null, parent_name: null, parent_email: null, parent_phone: null, answers: {}, submitted_at: null };
  const entries = Object.values(sub.answers ?? {});
  const fullNames: { label: string; first: string; last: string }[] = [];

  for (const a of entries) {
    const type = a.type ?? "";
    if (SKIP_TYPES.has(type)) continue;
    const label = clean(a.text ?? a.name ?? "", 120);
    const value = clean(answerText(a.answer), 500);
    if (!value) continue;
    const l = label.toLowerCase();

    if (type === "control_fullname") {
      const o = (a.answer ?? {}) as Record<string, unknown>;
      fullNames.push({ label: l, first: clean(answerText(o.first), 80), last: clean(answerText(o.last), 80) });
      continue;
    }
    if (type === "control_email" || /e-?mail/.test(l)) {
      const email = value.toLowerCase();
      if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && !out.parent_email) out.parent_email = email.slice(0, 254);
      continue;
    }
    if (type === "control_phone" || /phone|mobile|cell/.test(l)) {
      if (!out.parent_phone) out.parent_phone = clean(value, 40);
      continue;
    }
    if (isParent(l) && /name/.test(l)) {
      out.parent_name = out.parent_name ?? clean(value, 160);
      continue;
    }
    if (/first/.test(l) && /(athlete|player|participant|child|son|camper)|^first/.test(l) && !isParent(l)) {
      out.participant_first_name = out.participant_first_name ?? clean(value, 80);
      continue;
    }
    if (/last|surname/.test(l) && !isParent(l)) {
      out.participant_last_name = out.participant_last_name ?? clean(value, 80);
      continue;
    }
    if (/grad(uat)?|class of/.test(l)) {
      const m = value.match(/(20\d{2})/);
      if (m && Number(m[1]) >= 2025 && Number(m[1]) <= 2045) out.graduation_year = Number(m[1]);
      continue;
    }
    if (/\bgrade\b/.test(l)) {
      const m = value.match(/\d{1,2}/);
      if (m && Number(m[0]) >= 1 && Number(m[0]) <= 12) out.grade = Number(m[0]);
      continue;
    }
    if (/position/.test(l)) {
      out.position = out.position ?? clean(value, 40);
      continue;
    }
    if (/\bteam\b|\bclub\b/.test(l)) {
      out.team = out.team ?? clean(value, 120);
      continue;
    }
    if (!label || SENSITIVE_LABEL.test(label) || value.length > 300 || /control_textarea/.test(type) && value.length > 200) continue;
    if (label) out.answers[label] = value;
  }

  for (const fn of fullNames) {
    if (isParent(fn.label)) {
      out.parent_name = out.parent_name ?? ([fn.first, fn.last].filter(Boolean).join(" ") || null);
    } else if (!out.participant_first_name && !out.participant_last_name) {
      out.participant_first_name = fn.first || null;
      out.participant_last_name = fn.last || null;
    } else if (!out.parent_name) {
      out.parent_name = [fn.first, fn.last].filter(Boolean).join(" ") || null;
    }
  }
  if (sub.created_at) {
    const t = Date.parse(sub.created_at.replace(" ", "T") + (/[zZ]|[+-]\d{2}:?\d{2}$/.test(sub.created_at) ? "" : "Z"));
    if (!Number.isNaN(t)) out.submitted_at = new Date(t).toISOString();
  }
  return out;
}
