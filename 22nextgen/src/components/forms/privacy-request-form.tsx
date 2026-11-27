"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { dataRequestSchema, type DataRequestInput } from "@/lib/validation/public";
import { submitDataRequest } from "@/lib/actions/public-forms";
import { Field } from "./field";
import { Btn } from "@/components/site/btn";

export function PrivacyRequestForm() {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const { register, handleSubmit, setError, formState: { errors } } = useForm<DataRequestInput>({
    resolver: zodResolver(dataRequestSchema),
    defaultValues: { request_type: "correction", athlete_reference: "", requester_name: "", requester_email: "", details: "", website: "" },
  });
  const onSubmit = (v: DataRequestInput) =>
    start(async () => {
      const res = await submitDataRequest(v);
      if (!res.ok) {
        Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => setError(k as keyof DataRequestInput, { message: m[0] }));
        toast.error(res.error);
        return;
      }
      setDone(true);
    });
  if (done) {
    return (
      <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-emerald-100">
        <CheckCircle2 className="mb-2 size-6 text-emerald-300" />
        <p>Your request was recorded. We will verify that you are the athlete&apos;s parent or guardian before acting on it, and respond by email.</p>
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="hidden" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" {...register("website")} /></label></div>
      <Field label="Request type" htmlFor="pr-type" error={errors.request_type?.message} required>
        <select id="pr-type" className="field" {...register("request_type")}>
          <option value="correction">Correct information on a profile</option>
          <option value="withdraw_consent">Withdraw consent / remove public profile</option>
          <option value="deletion">Delete my child&apos;s data</option>
          <option value="access">Request a copy of data we hold</option>
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name (parent/guardian)" htmlFor="pr-name" error={errors.requester_name?.message} required><input id="pr-name" className="field" autoComplete="name" {...register("requester_name")} /></Field>
        <Field label="Your email" htmlFor="pr-email" error={errors.requester_email?.message} required><input id="pr-email" type="email" className="field" autoComplete="email" {...register("requester_email")} /></Field>
      </div>
      <Field label="Athlete (name or profile link)" htmlFor="pr-ref" error={errors.athlete_reference?.message}><input id="pr-ref" className="field" {...register("athlete_reference")} /></Field>
      <Field label="Details" htmlFor="pr-details" error={errors.details?.message} hint="Do not include birth dates, addresses or other sensitive details here; we will ask for verification separately."><textarea id="pr-details" rows={4} className="field" {...register("details")} /></Field>
      <Btn type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Submit request</Btn>
    </form>
  );
}
