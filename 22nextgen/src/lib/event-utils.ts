import type { EventRow } from "@/lib/types";
import { labelFor, EVENT_TYPES, REGISTRATION_STATUSES } from "@/lib/site";
import { formatCents } from "@/lib/format";

export function gradesLabel(grades: number[]): string | null {
  if (!grades?.length) return null;
  const sorted = [...grades].sort((a, b) => a - b);
  const contiguous = sorted.every((g, i) => i === 0 || g === sorted[i - 1] + 1);
  if (sorted.length === 1) return `Grade ${sorted[0]}`;
  return contiguous ? `Grades ${sorted[0]}–${sorted[sorted.length - 1]}` : `Grades ${sorted.join(", ")}`;
}

export function eligibilityLabel(e: Pick<EventRow, "eligible_grades" | "eligible_age_min" | "eligible_age_max" | "eligible_grad_years">): string {
  const parts: string[] = [];
  const g = gradesLabel(e.eligible_grades);
  if (g) parts.push(g);
  if (e.eligible_age_min && e.eligible_age_max) parts.push(`Ages ${e.eligible_age_min}–${e.eligible_age_max}`);
  else if (e.eligible_age_min) parts.push(`Ages ${e.eligible_age_min}+`);
  else if (e.eligible_age_max) parts.push(`Ages up to ${e.eligible_age_max}`);
  if (e.eligible_grad_years?.length) parts.push(`Class of ${[...e.eligible_grad_years].sort().join(", ")}`);
  return parts.join(" · ") || "Open to all youth athletes";
}

export function locationLabel(e: Pick<EventRow, "venue_name" | "city" | "state">): string {
  const cityState = [e.city, e.state].filter(Boolean).join(", ");
  return [e.venue_name, cityState].filter(Boolean).join(" · ") || "Location to be announced";
}

export function priceLabel(e: Pick<EventRow, "price_cents">): string {
  if (e.price_cents === null || e.price_cents === undefined) return "Pricing TBA";
  return e.price_cents === 0 ? "Free" : (formatCents(e.price_cents) as string);
}

export const typeLabel = (t: string) => labelFor(EVENT_TYPES, t);
export const registrationLabel = (s: string) => labelFor(REGISTRATION_STATUSES, s);
export const canRegister = (e: Pick<EventRow, "registration_status" | "jotform_form_id" | "jotform_url">) =>
  (e.registration_status === "open" || e.registration_status === "waitlist") && !!(e.jotform_form_id || e.jotform_url);

export function eventAddress(e: Pick<EventRow, "venue_name" | "address_line" | "city" | "state" | "postal_code">): string | null {
  const line = [e.address_line, [e.city, e.state].filter(Boolean).join(", "), e.postal_code].filter(Boolean).join(" ");
  return [e.venue_name, line].filter(Boolean).join(", ") || null;
}
