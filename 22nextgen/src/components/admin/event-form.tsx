"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { eventSchema, type EventFormInput, type EventFormOutput } from "@/lib/validation/admin";
import { saveEvent } from "@/lib/actions/admin/events";
import { Field } from "@/components/forms/field";
import { Panel, Notice, adminBtn } from "./ui";
import { ImageField } from "./image-field";
import { RichTextEditor } from "./rich-text-editor";
import { EVENT_TYPES, REGIONS, REGISTRATION_STATUSES, US_STATES } from "@/lib/site";
import { slugify } from "@/lib/format";
import { parseJotformInput } from "@/lib/jotform";

export const EMPTY_EVENT: EventFormInput = {
  title: "", slug: "", event_type: "combine", summary: "", description: "", event_date: "", start_time: "", end_time: "", time_zone: "America/New_York",
  venue_name: "", address_line: "", city: "", state: "NJ", postal_code: "", region: "", eligible_age_min: "", eligible_age_max: "", eligible_grades: [],
  eligible_grad_years: "", eligibility_notes: "", price_dollars: "", price_note: "", capacity: "", registration_status: "coming_soon", itinerary: [], faqs: [],
  hero_image_path: "", card_image_path: "", gallery: [], jotform_input: "", featured: false, seo_title: "", seo_description: "", staff: [], sponsor_ids: [],
};

const TIME_ZONES = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"];

export function EventForm({ eventId, initial, sponsors, status }: { eventId: string | null; initial: EventFormInput; sponsors: { id: string; name: string }[]; status?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [slugTouched, setSlugTouched] = useState(!!eventId);
  const form = useForm<EventFormInput, unknown, EventFormOutput>({ resolver: zodResolver(eventSchema), defaultValues: initial, mode: "onBlur" });
  const { register, control, handleSubmit, setValue, setError, watch, formState: { errors } } = form;
  const itinerary = useFieldArray({ control, name: "itinerary" });
  const faqs = useFieldArray({ control, name: "faqs" });
  const staff = useFieldArray({ control, name: "staff" });
  const gallery = useFieldArray({ control, name: "gallery" });
  const jotformInput = watch("jotform_input") ?? "";
  const jotformParsed = jotformInput ? parseJotformInput(jotformInput) : null;
  const err = (k: keyof EventFormInput) => (errors[k] as { message?: string } | undefined)?.message;

  const submit = (intent: "save" | "publish") =>
    handleSubmit(() =>
      start(async () => {
        const res = await saveEvent(eventId, form.getValues(), intent);
        if (!res.ok) {
          Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => setError(k as keyof EventFormInput, { message: m[0] }));
          toast.error(res.error);
          return;
        }
        toast.success(intent === "publish" ? "Event published" : "Event saved");
        if (!eventId) router.replace(`/admin/events/${res.data.id}`);
        else router.refresh();
      }),
      () => toast.error("Please fix the highlighted fields."),
    )();

  return (
    <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-6">
      <Panel title="Basics">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Event title" htmlFor="ev-title" error={err("title")} required className="md:col-span-2">
            <input id="ev-title" className="field" {...register("title", { onChange: (e) => { if (!slugTouched) setValue("slug", slugify(e.target.value)); } })} />
          </Field>
          <Field label="URL slug" htmlFor="ev-slug" error={err("slug")} hint="Used in the address: /events/your-slug" required>
            <input id="ev-slug" className="field" {...register("slug", { onChange: () => setSlugTouched(true) })} />
          </Field>
          <Field label="Event type" htmlFor="ev-type" error={err("event_type")}>
            <select id="ev-type" className="field" {...register("event_type")}>{EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
          </Field>
          <Field label="Short summary" htmlFor="ev-summary" error={err("summary")} hint="Shown on cards and search results (max 500 characters)." className="md:col-span-2">
            <textarea id="ev-summary" rows={2} className="field" {...register("summary")} />
          </Field>
          <div className="md:col-span-2">
            <p className="mb-1.5 text-sm font-medium text-white/85">Description</p>
            <Controller control={control} name="description" render={({ field }) => <RichTextEditor label="Event description" value={field.value ?? ""} onChange={field.onChange} />} />
          </div>
        </div>
      </Panel>

      <Panel title="Date, time & location">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Date" htmlFor="ev-date" error={err("event_date")}><input id="ev-date" type="date" className="field" {...register("event_date")} /></Field>
          <Field label="Start time" htmlFor="ev-start" error={err("start_time")}><input id="ev-start" type="time" className="field" {...register("start_time")} /></Field>
          <Field label="End time" htmlFor="ev-end" error={err("end_time")}><input id="ev-end" type="time" className="field" {...register("end_time")} /></Field>
          <Field label="Time zone" htmlFor="ev-tz"><select id="ev-tz" className="field" {...register("time_zone")}>{TIME_ZONES.map((z) => <option key={z}>{z}</option>)}</select></Field>
          <Field label="Venue name" htmlFor="ev-venue" className="md:col-span-2"><input id="ev-venue" className="field" {...register("venue_name")} /></Field>
          <Field label="Street address" htmlFor="ev-addr" className="md:col-span-2"><input id="ev-addr" className="field" {...register("address_line")} /></Field>
          <Field label="City" htmlFor="ev-city"><input id="ev-city" className="field" {...register("city")} /></Field>
          <Field label="State" htmlFor="ev-state" error={err("state")}><select id="ev-state" className="field" {...register("state")}><option value="">—</option>{US_STATES.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="ZIP" htmlFor="ev-zip"><input id="ev-zip" className="field" {...register("postal_code")} /></Field>
          <Field label="Region" htmlFor="ev-region"><select id="ev-region" className="field" {...register("region")}><option value="">—</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
        </div>
      </Panel>

      <Panel title="Eligibility, pricing & capacity">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Min age" htmlFor="ev-amin" error={err("eligible_age_min")}><input id="ev-amin" inputMode="numeric" className="field" {...register("eligible_age_min")} /></Field>
          <Field label="Max age" htmlFor="ev-amax" error={err("eligible_age_max")}><input id="ev-amax" inputMode="numeric" className="field" {...register("eligible_age_max")} /></Field>
          <Field label="Graduation classes" htmlFor="ev-years" hint="Comma separated, e.g. 2030, 2031" error={err("eligible_grad_years")} className="md:col-span-2"><input id="ev-years" className="field" {...register("eligible_grad_years")} /></Field>
          <fieldset className="md:col-span-4">
            <legend className="mb-1.5 text-sm font-medium text-white/85">Eligible grades</legend>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 10 }, (_, i) => String(i + 3)).map((g) => (
                <label key={g} className="flex cursor-pointer items-center gap-2 rounded-md border border-white/15 px-3 py-1.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/15"><input type="checkbox" value={g} className="accent-[#147dff]" {...register("eligible_grades")} />{g}</label>
              ))}
            </div>
          </fieldset>
          <Field label="Eligibility notes" htmlFor="ev-elignotes" className="md:col-span-4"><input id="ev-elignotes" className="field" {...register("eligibility_notes")} /></Field>
          <Field label="Displayed price (USD)" htmlFor="ev-price" error={err("price_dollars")} hint="Leave blank for “Pricing TBA”. 0 shows Free."><input id="ev-price" inputMode="decimal" className="field" placeholder="75" {...register("price_dollars")} /></Field>
          <Field label="Price note" htmlFor="ev-pricenote" className="md:col-span-2"><input id="ev-pricenote" className="field" placeholder="e.g. per athlete" {...register("price_note")} /></Field>
          <Field label="Capacity" htmlFor="ev-cap" error={err("capacity")}><input id="ev-cap" inputMode="numeric" className="field" {...register("capacity")} /></Field>
          <Field label="Registration status" htmlFor="ev-regstatus" className="md:col-span-2"><select id="ev-regstatus" className="field" {...register("registration_status")}>{REGISTRATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
        </div>
        <div className="mt-4"><Notice tone="amber" title="Displayed price does not change the Jotform charge"><span className="flex gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0" />The price here is for display only. The amount a family is actually charged is set inside the Jotform. Always update the Jotform payment amount to match.</span></Notice></div>
      </Panel>

      <Panel title="Registration (Jotform)" description="Payment, waiver and confirmation are handled by Jotform. We embed the form and receive registrations by webhook.">
        <Field label="Jotform URL or form ID" htmlFor="ev-jotform" error={err("jotform_input")} hint="e.g. https://form.jotform.com/123456789012345 or just 123456789012345">
          <input id="ev-jotform" className="field" {...register("jotform_input")} />
        </Field>
        {jotformParsed?.ok ? (
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-emerald-300">Valid. {jotformParsed.formId ? <>Form ID <code className="rounded bg-white/10 px-1">{jotformParsed.formId}</code> detected.</> : "No form ID detected."}</p>
            {jotformParsed.warnings.map((w) => <Notice key={w} tone="amber">{w}</Notice>)}
          </div>
        ) : null}
        <p className="mt-3 text-xs text-white/45">Webhook URL for this form (add in Jotform → Settings → Integrations → Webhooks): <code className="rounded bg-white/10 px-1">{`{SITE_URL}/api/webhooks/jotform?token=<JOTFORM_WEBHOOK_SECRET>`}</code></p>
      </Panel>

      <Panel title="Images" description="Upload event graphics to Supabase Storage. Use only images you own or are licensed to use.">
        <div className="grid gap-6 md:grid-cols-2">
          <Controller control={control} name="hero_image_path" render={({ field }) => <ImageField label="Hero image (event page banner)" folder="events" value={field.value} onChange={field.onChange} />} />
          <Controller control={control} name="card_image_path" render={({ field }) => <ImageField label="Card image (event listings)" folder="events" value={field.value} onChange={field.onChange} />} />
        </div>
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium">Gallery</p>
          <div className="space-y-3">
            {gallery.fields.map((f, i) => (
              <div key={f.id} className="flex items-start gap-3 rounded-lg border border-white/10 p-3">
                <Controller control={control} name={`gallery.${i}.path`} render={({ field }) => <ImageField label={`Image ${i + 1}`} folder="events" value={field.value} onChange={field.onChange} />} />
                <input aria-label={`Image ${i + 1} alt text`} placeholder="Alt text" className="field mt-6 max-w-xs" {...register(`gallery.${i}.alt`)} />
                <button type="button" aria-label="Remove image" className={adminBtn.secondary + " mt-6"} onClick={() => gallery.remove(i)}><Trash2 className="size-4" /></button>
              </div>
            ))}
            <button type="button" className={adminBtn.secondary} onClick={() => gallery.append({ path: "", alt: "" })}><Plus className="size-4" />Add gallery image</button>
          </div>
        </div>
      </Panel>

      <Panel title="Itinerary">
        <div className="space-y-3">
          {itinerary.fields.map((f, i) => (
            <div key={f.id} className="grid gap-2 rounded-lg border border-white/10 p-3 md:grid-cols-[8rem_1fr_2fr_auto]">
              <input aria-label="Time" placeholder="9:00 AM" className="field" {...register(`itinerary.${i}.time`)} />
              <input aria-label="Title" placeholder="Check-in" className="field" {...register(`itinerary.${i}.title`)} />
              <input aria-label="Description" placeholder="Details (optional)" className="field" {...register(`itinerary.${i}.description`)} />
              <button type="button" aria-label="Remove itinerary row" className={adminBtn.secondary} onClick={() => itinerary.remove(i)}><Trash2 className="size-4" /></button>
            </div>
          ))}
          <button type="button" className={adminBtn.secondary} onClick={() => itinerary.append({ time: "", title: "", description: "" })}><Plus className="size-4" />Add itinerary row</button>
        </div>
      </Panel>

      <Panel title="Coaching staff">
        <div className="space-y-3">
          {staff.fields.map((f, i) => (
            <div key={f.id} className="space-y-3 rounded-lg border border-white/10 p-3">
              <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                <input aria-label="Name" placeholder="Name" className="field" {...register(`staff.${i}.name`)} />
                <input aria-label="Role" placeholder="Role / title" className="field" {...register(`staff.${i}.role_title`)} />
                <button type="button" aria-label="Remove staff member" className={adminBtn.secondary} onClick={() => staff.remove(i)}><Trash2 className="size-4" /></button>
              </div>
              <textarea aria-label="Bio" rows={2} placeholder="Short bio (optional)" className="field" {...register(`staff.${i}.bio`)} />
              <Controller control={control} name={`staff.${i}.image_path`} render={({ field }) => <ImageField label="Photo" folder="events" value={field.value} onChange={field.onChange} />} />
            </div>
          ))}
          <button type="button" className={adminBtn.secondary} onClick={() => staff.append({ name: "", role_title: "", bio: "", image_path: "" })}><Plus className="size-4" />Add staff member</button>
        </div>
      </Panel>

      <Panel title="FAQs">
        <div className="space-y-3">
          {faqs.fields.map((f, i) => (
            <div key={f.id} className="space-y-2 rounded-lg border border-white/10 p-3">
              <div className="flex gap-2"><input aria-label="Question" placeholder="Question" className="field" {...register(`faqs.${i}.question`)} /><button type="button" aria-label="Remove FAQ" className={adminBtn.secondary} onClick={() => faqs.remove(i)}><Trash2 className="size-4" /></button></div>
              <textarea aria-label="Answer" rows={2} placeholder="Answer" className="field" {...register(`faqs.${i}.answer`)} />
            </div>
          ))}
          <button type="button" className={adminBtn.secondary} onClick={() => faqs.append({ question: "", answer: "" })}><Plus className="size-4" />Add FAQ</button>
        </div>
      </Panel>

      <Panel title="Sponsors, SEO & placement">
        <div className="grid gap-4 md:grid-cols-2">
          <fieldset className="md:col-span-2">
            <legend className="mb-1.5 text-sm font-medium">Event sponsors</legend>
            {sponsors.length ? (
              <div className="flex flex-wrap gap-2">{sponsors.map((s) => <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-white/15 px-3 py-1.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/15"><input type="checkbox" value={s.id} className="accent-[#147dff]" {...register("sponsor_ids")} />{s.name}</label>)}</div>
            ) : <p className="text-sm text-white/50">No sponsors yet. Add some under Sponsors.</p>}
          </fieldset>
          <Field label="SEO title" htmlFor="ev-seot" error={err("seo_title")} hint="Optional. Defaults to the event title."><input id="ev-seot" className="field" {...register("seo_title")} /></Field>
          <Field label="SEO description" htmlFor="ev-seod" error={err("seo_description")}><input id="ev-seod" className="field" {...register("seo_description")} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#147dff]" {...register("featured")} />Feature this event</label>
        </div>
      </Panel>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-white/10 bg-[#0a0a0b]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <button type="button" disabled={pending} onClick={() => submit("save")} className={adminBtn.secondary}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Save {status === "published" ? "changes" : "draft"}</button>
        {status !== "published" ? <button type="button" disabled={pending} onClick={() => submit("publish")} className={adminBtn.primary}>Save &amp; publish</button> : null}
        {Object.keys(errors).length ? <span role="alert" className="text-sm text-red-300">Fix the highlighted fields to continue.</span> : null}
      </div>
    </form>
  );
}
