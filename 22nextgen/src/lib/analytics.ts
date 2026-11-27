"use client";

/** GA4 helper with privacy guards: only allowlisted, non-identifying params are ever sent. */
const ALLOWED_PARAMS = new Set(["event_slug", "event_type", "location", "source", "plan", "page_type", "form"]);
const EMAIL_LIKE = /[^\s@]+@[^\s@]+/;

export type AnalyticsEvent =
  | "event_page_view"
  | "registration_click"
  | "registration_form_open"
  | "partnership_inquiry"
  | "membership_interest";

type Gtag = (...args: unknown[]) => void;

export function consentGranted(): boolean {
  try {
    return window.localStorage.getItem("ng_consent") === "granted";
  } catch {
    return false;
  }
}

export function sanitizeParams(params: Record<string, unknown> = {}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (!ALLOWED_PARAMS.has(k)) continue;
    if (typeof v !== "string" && typeof v !== "number") continue;
    const s = String(v).slice(0, 100);
    if (EMAIL_LIKE.test(s)) continue;
    out[k] = s;
  }
  return out;
}

export function trackEvent(name: AnalyticsEvent, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !consentGranted()) return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (!gtag) return;
  gtag("event", name, sanitizeParams(params));
}
