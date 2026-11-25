"use server";

import { createPublicClient } from "@/lib/supabase/public";
import { dataRequestSchema, fieldErrorsFrom, inquirySchema } from "@/lib/validation/public";
import { fail, okay, type ActionResult } from "@/lib/actions/result";

/** Public inquiry (contact / partnership / membership interest). Anonymous insert; RLS permits INSERT only. */
export async function submitInquiry(input: unknown): Promise<ActionResult> {
  const parsed = inquirySchema.safeParse(input);
  if (!parsed.success) return fail("Please check the highlighted fields.", fieldErrorsFrom(parsed.error));
  const v = parsed.data;
  if (v.website) return okay(); // honeypot: pretend success
  const supabase = createPublicClient();
  if (!supabase) return fail("This form is temporarily unavailable. Please try again later.");
  const { error } = await supabase.from("inquiries").insert({
    kind: v.kind,
    name: v.name,
    email: v.email,
    organization: v.organization || null,
    phone: v.phone || null,
    message: v.message || null,
    metadata: v.interest ? { interest: v.interest } : {},
  });
  if (error) {
    console.error("[inquiry] insert failed", error.code);
    return fail("We couldn't send your message. Please try again in a moment.");
  }
  return okay();
}

/** Privacy request: correction, consent withdrawal, deletion or access. Handled by admins in /admin/privacy. */
export async function submitDataRequest(input: unknown): Promise<ActionResult> {
  const parsed = dataRequestSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the highlighted fields.", fieldErrorsFrom(parsed.error));
  const v = parsed.data;
  if (v.website) return okay();
  const supabase = createPublicClient();
  if (!supabase) return fail("This form is temporarily unavailable. Please email us instead.");
  const { error } = await supabase.from("data_requests").insert({
    request_type: v.request_type,
    athlete_reference: v.athlete_reference || null,
    requester_name: v.requester_name,
    requester_email: v.requester_email,
    details: v.details || null,
  });
  if (error) {
    console.error("[data-request] insert failed", error.code);
    return fail("We couldn't record your request. Please try again.");
  }
  return okay();
}
