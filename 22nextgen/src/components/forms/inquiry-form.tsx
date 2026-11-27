"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { inquirySchema, type InquiryInput } from "@/lib/validation/public";
import { submitInquiry } from "@/lib/actions/public-forms";
import { Field } from "./field";
import { Btn } from "@/components/site/btn";
import { trackEvent } from "@/lib/analytics";

const COPY = {
  contact: { cta: "Send message", done: "Thanks. We received your message and will reply by email.", messageLabel: "How can we help?" },
  partnership: { cta: "Submit partnership inquiry", done: "Thank you. Our team will reach out about partnership options.", messageLabel: "Tell us about your brand and goals" },
  membership_interest: { cta: "Notify me at launch", done: "You're on the list. We'll email you when NEXT GEN+ billing opens. No payment has been taken.", messageLabel: "Anything you'd like us to know? (optional)" },
} as const;

export function InquiryForm({
  kind,
  cta,
  messageLabel,
  doneMessage,
  interest,
}: {
  kind: InquiryInput["kind"];
  cta?: string;
  messageLabel?: string;
  doneMessage?: string;
  interest?: string;
}) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const copy = { ...COPY[kind], ...(cta ? { cta } : {}), ...(messageLabel ? { messageLabel } : {}), ...(doneMessage ? { done: doneMessage } : {}) };
  const { register, handleSubmit, setError, reset, formState: { errors } } = useForm<InquiryInput>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { kind, name: "", email: "", organization: "", phone: "", message: "", website: "", interest: interest ?? "" },
  });

  const onSubmit = (values: InquiryInput) =>
    start(async () => {
      const res = await submitInquiry(values);
      if (!res.ok) {
        Object.entries(res.fieldErrors ?? {}).forEach(([k, msgs]) => setError(k as keyof InquiryInput, { message: msgs[0] }));
        toast.error(res.error);
        return;
      }
      if (kind === "partnership") trackEvent("partnership_inquiry", { form: "partnership" });
      if (kind === "membership_interest") trackEvent("membership_interest", { plan: "next_gen_plus" });
      reset();
      setDone(true);
    });

  if (done) {
    return (
      <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-emerald-100">
        <CheckCircle2 className="mb-2 size-6 text-emerald-300" />
        <p>{copy.done}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <input type="hidden" {...register("kind")} />
      <input type="hidden" {...register("interest")} />
      <div className="hidden" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" {...register("website")} /></label></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${kind}-name`} error={errors.name?.message} required><input id={`${kind}-name`} autoComplete="name" className="field" {...register("name")} /></Field>
        <Field label="Email" htmlFor={`${kind}-email`} error={errors.email?.message} required><input id={`${kind}-email`} type="email" autoComplete="email" className="field" {...register("email")} /></Field>
      </div>
      {kind === "partnership" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company / organization" htmlFor="partnership-org" error={errors.organization?.message}><input id="partnership-org" autoComplete="organization" className="field" {...register("organization")} /></Field>
          <Field label="Phone (optional)" htmlFor="partnership-phone" error={errors.phone?.message}><input id="partnership-phone" type="tel" autoComplete="tel" className="field" {...register("phone")} /></Field>
        </div>
      ) : null}
      <Field label={copy.messageLabel} htmlFor={`${kind}-message`} error={errors.message?.message}><textarea id={`${kind}-message`} rows={5} className="field" {...register("message")} /></Field>
      <p className="text-xs text-white/45">Please do not include children&apos;s personal information in this form. We use your details only to respond to you.</p>
      <Btn type="submit" disabled={pending} size="md" className="w-full sm:w-auto">{pending ? <Loader2 className="size-4 animate-spin" /> : null}{copy.cta}</Btn>
    </form>
  );
}
