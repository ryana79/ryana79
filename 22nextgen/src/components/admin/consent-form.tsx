"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { consentSchema } from "@/lib/validation/admin";
import { recordConsent } from "@/lib/actions/admin/athletes";
import { Field } from "@/components/forms/field";
import { adminBtn } from "./ui";

type ConsentInput = { athlete_id: string; status: string; guardian_name: string; guardian_relationship: string; method: string; verifiable_parental_consent: boolean; evidence_note: string };

export function ConsentForm({ athleteId, defaultGuardian }: { athleteId: string; defaultGuardian?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useForm<ConsentInput>({
    resolver: zodResolver(consentSchema) as never,
    defaultValues: { athlete_id: athleteId, status: "granted", guardian_name: defaultGuardian ?? "", guardian_relationship: "Parent", method: "", verifiable_parental_consent: false, evidence_note: "" },
  });
  const { register, control, handleSubmit, setError, reset, formState: { errors } } = form;
  const status = useWatch({ control, name: "status" });
  const err = (k: keyof ConsentInput) => (errors[k] as { message?: string } | undefined)?.message;

  const onSubmit = handleSubmit(() =>
    start(async () => {
      const values = form.getValues();
      const res = await recordConsent({ ...values, method: values.method || undefined });
      if (!res.ok) {
        Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => setError(k as keyof ConsentInput, { message: m[0] }));
        toast.error(res.error);
        return;
      }
      toast.success(values.status === "withdrawn" ? "Consent withdrawn. The profile was unpublished." : "Consent recorded");
      reset({ ...values, evidence_note: "" });
      router.refresh();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 md:grid-cols-2">
      <Field label="Consent decision" htmlFor="c-status">
        <select id="c-status" className="field" {...register("status")}>
          <option value="granted">Granted</option>
          <option value="pending">Pending</option>
          <option value="declined">Declined</option>
          <option value="withdrawn">Withdrawn (unpublishes immediately)</option>
        </select>
      </Field>
      <Field label="How was it obtained?" htmlFor="c-method" error={err("method")}>
        <select id="c-method" className="field" {...register("method")}>
          <option value="">Select…</option>
          <option value="signed_form">Signed form</option>
          <option value="email_confirmation">Email confirmation</option>
          <option value="electronic_signature">Electronic signature</option>
          <option value="other">Other</option>
        </select>
      </Field>
      <Field label="Guardian name" htmlFor="c-gn" error={err("guardian_name")}><input id="c-gn" className="field" {...register("guardian_name")} /></Field>
      <Field label="Relationship" htmlFor="c-rel"><input id="c-rel" className="field" {...register("guardian_relationship")} /></Field>
      <Field label="Evidence note" htmlFor="c-note" hint="Where the signed form or email is stored. Do not paste sensitive documents here." className="md:col-span-2"><textarea id="c-note" rows={2} className="field" {...register("evidence_note")} /></Field>
      {status === "granted" ? (
        <label className="flex items-start gap-2 text-sm md:col-span-2">
          <input type="checkbox" className="mt-1 accent-[#147dff]" {...register("verifiable_parental_consent")} />
          <span>This is verifiable parental consent under the approved COPPA workflow. <span className="text-white/45">(Required for athletes under 13, and also requires the Owner to enable the COPPA workflow in Settings once counsel approves it.)</span></span>
        </label>
      ) : null}
      <div className="md:col-span-2"><button type="submit" disabled={pending} className={adminBtn.primary}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Record consent</button></div>
    </form>
  );
}
