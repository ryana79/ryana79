import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max);

export const inquirySchema = z.object({
  kind: z.enum(["contact", "partnership", "membership_interest"]),
  name: trimmed(160).min(1, "Please enter your name."),
  email: z.string().trim().max(254).email("Enter a valid email address."),
  organization: trimmed(200).optional().or(z.literal("")),
  phone: trimmed(40).optional().or(z.literal("")),
  message: trimmed(5000).optional().or(z.literal("")),
  interest: trimmed(120).optional().or(z.literal("")),
  website: z.string().max(0).optional().or(z.literal("")),
});
export type InquiryInput = z.infer<typeof inquirySchema>;

export const dataRequestSchema = z.object({
  request_type: z.enum(["correction", "withdraw_consent", "deletion", "access"]),
  athlete_reference: trimmed(300).optional().or(z.literal("")),
  requester_name: trimmed(160).min(1, "Please enter your name."),
  requester_email: z.string().trim().max(254).email("Enter a valid email address."),
  details: trimmed(5000).optional().or(z.literal("")),
  website: z.string().max(0).optional().or(z.literal("")),
});
export type DataRequestInput = z.infer<typeof dataRequestSchema>;

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export const signUpSchema = z.object({
  display_name: trimmed(120).min(1, "Please enter your name."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(10, "Use at least 10 characters.").max(200),
  accept_terms: z.literal(true, { error: "You must accept the Terms and Privacy Policy." }),
  is_adult: z.literal(true, { error: "Accounts must be created by a parent, guardian or adult athlete (18+)." }),
});

/** Allow only same-site relative redirects. */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

export function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
