"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { CALENDAR_2027 } from "@/lib/events/calendar-2027";
import { GRADE_BANDS, eventLeadSchema, type EventLeadInput } from "@/lib/validation/leads";
import { submitEventLead } from "@/lib/actions/event-leads";
import { Field } from "@/components/forms/field";
import { btnClass } from "./btn";
import { cn } from "@/lib/utils";

export function EventUpdatesButton({ slug, className, size = "md" }: { slug: string; className?: string; size?: "sm" | "md" | "lg" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={btnClass({ size, className })} onClick={() => setOpen(true)}>Get Event Updates</button>
      {open ? <EventUpdatesDialog slug={slug} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function EventUpdatesDialog({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const { register, handleSubmit, setError, formState: { errors } } = useForm<z.input<typeof eventLeadSchema>, unknown, EventLeadInput>({
    resolver: zodResolver(eventLeadSchema),
    defaultValues: { name: "", email: "", grade_band: "", town: "", events: [slug], news_opt_in: false, website: "" },
  });

  const onSubmit = (values: EventLeadInput) =>
    start(async () => {
      const res = await submitEventLead(values);
      if (!res.ok) {
        Object.entries(res.fieldErrors ?? {}).forEach(([key, messages]) => setError(key as keyof EventLeadInput, { message: messages[0] }));
        toast.error(res.error);
        return;
      }
      setDone(true);
    });

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="event-updates-title">
      <button type="button" className="absolute inset-0" aria-label="Close event updates form" onClick={onClose} />
      <div className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-[#111113] p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Event updates</p>
            <h2 id="event-updates-title" className="mt-1 font-display text-3xl font-extrabold uppercase leading-none">Get event updates</h2>
          </div>
          <button type="button" className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close" onClick={onClose}><X className="size-5" /></button>
        </div>
        {done ? (
          <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-100">
            <CheckCircle2 className="mb-2 size-6 text-emerald-300" />
            <p>You are on the list. We will email this parent or guardian when there is news about the events you picked.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="hidden" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" {...register("website")} /></label></div>
            <Field label="Parent or guardian name" htmlFor="lead-name" error={errors.name?.message} required>
              <input id="lead-name" autoComplete="name" className="field" {...register("name")} />
            </Field>
            <Field label="Parent or guardian email" htmlFor="lead-email" error={errors.email?.message} required>
              <input id="lead-email" type="email" autoComplete="email" className="field" {...register("email")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Grade band" htmlFor="lead-grade" error={errors.grade_band?.message} hint="Optional">
                <select id="lead-grade" className="field" defaultValue="" {...register("grade_band")}>
                  <option value="">Skip</option>
                  {GRADE_BANDS.map((band) => <option key={band} value={band}>{band}</option>)}
                </select>
              </Field>
              <Field label="Town" htmlFor="lead-town" error={errors.town?.message} hint="Optional">
                <input id="lead-town" autoComplete="address-level2" className="field" {...register("town")} />
              </Field>
            </div>
            <fieldset>
              <legend className="text-sm font-medium text-white/85">Events <span className="text-brand">*</span></legend>
              <div className="mt-2 space-y-2">
                {CALENDAR_2027.map((event) => (
                  <label key={event.slug} className="flex items-start gap-3 rounded-lg border border-white/10 px-3 py-2.5 text-sm">
                    <input type="checkbox" value={event.slug} className="mt-0.5 size-4 accent-[#147dff]" {...register("events")} />
                    <span><span className="font-medium">{event.title}</span><span className="mt-0.5 block text-xs text-white/45">{event.dateLabel}</span></span>
                  </label>
                ))}
              </div>
              {errors.events?.message ? <p role="alert" className="mt-1 text-xs text-red-300">{errors.events.message}</p> : null}
            </fieldset>
            <label className="flex items-start gap-3 text-sm text-white/80">
              <input type="checkbox" className="mt-0.5 size-4 accent-[#147dff]" {...register("news_opt_in")} />
              <span>Also send general 22 NEXT GEN news. This is optional and separate from the events above.</span>
            </label>
            <p className="text-xs text-white/45">Use a parent or guardian email. Please do not include a child name or other personal details.</p>
            <button type="submit" disabled={pending} className={cn(btnClass({ size: "md" }), "w-full")}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Get event updates</button>
          </form>
        )}
      </div>
    </div>
  );
}
