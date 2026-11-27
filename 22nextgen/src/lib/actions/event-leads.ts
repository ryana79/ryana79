"use server";

import { createPublicClient } from "@/lib/supabase/public";
import { eventLeadSchema } from "@/lib/validation/leads";
import { fieldErrorsFrom } from "@/lib/validation/public";
import { fail, okay, type ActionResult } from "@/lib/actions/result";

export async function submitEventLead(input: unknown): Promise<ActionResult> {
  const parsed = eventLeadSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the highlighted fields.", fieldErrorsFrom(parsed.error));
  if (parsed.data.website) return okay();
  const supabase = createPublicClient();
  if (!supabase) return fail("This form is temporarily unavailable. Please try again later.");
  const { error } = await supabase.rpc("submit_event_lead", {
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_grade_band: parsed.data.grade_band || null,
    p_town: parsed.data.town || null,
    p_event_slugs: [...new Set(parsed.data.events)],
    p_news_opt_in: parsed.data.news_opt_in,
  });
  if (error) {
    console.error("[event-lead] submit failed", error.code);
    return fail("We couldn't save your request. Please try again in a moment.");
  }
  return okay();
}
