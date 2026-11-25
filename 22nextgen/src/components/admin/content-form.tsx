"use client";

import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { siteContentSchema, type SiteContentInput } from "@/lib/validation/content";
import { saveSiteContent } from "@/lib/actions/admin/content";
import { Field } from "@/components/forms/field";
import { Notice, Panel, adminBtn } from "./ui";
import { ImageField } from "./image-field";

const SECTIONS = [
  ["events", "Upcoming events"],
  ["athletes", "Featured athletes"],
  ["leaderboards", "Leaderboards"],
  ["news", "News"],
  ["membership_section", "NEXT GEN+ promo"],
  ["sponsors", "Sponsors"],
] as const;

export function ContentForm({ initial }: { initial: SiteContentInput }) {
  const [pending, start] = useTransition();
  const form = useForm<SiteContentInput>({ resolver: zodResolver(siteContentSchema) as never, defaultValues: initial });
  const { register, control, handleSubmit, setError, formState: { errors } } = form;
  const e = errors as Record<string, Record<string, { message?: string }> | undefined>;

  const onSubmit = handleSubmit(
    () =>
      start(async () => {
        const res = await saveSiteContent(form.getValues());
        if (!res.ok) {
          Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => setError(k as never, { message: m[0] }));
          toast.error(res.error);
          return;
        }
        toast.success("Site content saved. Changes are live.");
      }),
    () => toast.error("Please fix the highlighted fields."),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Panel title="Homepage hero" actions={<label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#147dff]" {...register("hero.enabled")} />Visible</label>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Headline" htmlFor="c-h" error={e.hero?.headline?.message}><input id="c-h" className="field" {...register("hero.headline")} /></Field>
          <Field label="Sub-headline" htmlFor="c-sh" error={e.hero?.subhead?.message}><input id="c-sh" className="field" {...register("hero.subhead")} /></Field>
          <Field label="Tagline" htmlFor="c-tl" className="md:col-span-2"><input id="c-tl" className="field" {...register("hero.tagline")} /></Field>
          <Field label="Primary button label" htmlFor="c-p1"><input id="c-p1" className="field" {...register("hero.primary_cta_label")} /></Field>
          <Field label="Primary button link" htmlFor="c-p2" error={e.hero?.primary_cta_href?.message}><input id="c-p2" className="field" {...register("hero.primary_cta_href")} /></Field>
          <Field label="Secondary button label" htmlFor="c-s1"><input id="c-s1" className="field" {...register("hero.secondary_cta_label")} /></Field>
          <Field label="Secondary button link" htmlFor="c-s2" error={e.hero?.secondary_cta_href?.message}><input id="c-s2" className="field" {...register("hero.secondary_cta_href")} /></Field>
          <div className="md:col-span-2"><Controller control={control} name="hero.background_image_path" render={({ field }) => <ImageField label="Hero background image (optional)" hint="Use only photos you own or are licensed to use." folder="content" value={field.value} onChange={field.onChange} />} /></div>
        </div>
      </Panel>

      <Panel title="Homepage sections" description="Turn sections on or off and edit their headings.">
        <div className="space-y-5">
          {SECTIONS.map(([key, label]) => (
            <div key={key} className="grid gap-3 rounded-lg border border-white/10 p-4 md:grid-cols-[1fr_2fr_auto] md:items-end">
              <Field label={`${label} · title`} htmlFor={`c-${key}-t`}><input id={`c-${key}-t`} className="field" {...register(`${key}.title`)} /></Field>
              <Field label="Description" htmlFor={`c-${key}-d`}><input id={`c-${key}-d`} className="field" {...register(`${key}.description`)} /></Field>
              <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" className="accent-[#147dff]" {...register(`${key}.enabled`)} />Visible</label>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="NEXT GEN+ membership" description="Billing is not live yet; this controls what is displayed on the Membership page and homepage promo.">
        <div className="mb-4"><Notice tone="amber" title="No payments are collected">Changing the price here only changes the displayed price. Stripe billing is not connected, so no one can be charged.</Notice></div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Name" htmlFor="m-name"><input id="m-name" className="field" {...register("membership.name")} /></Field>
          <Field label="Price (USD)" htmlFor="m-price" error={e.membership?.price_dollars?.message}><input id="m-price" inputMode="decimal" className="field" {...register("membership.price_dollars")} /></Field>
          <Field label="Billing interval" htmlFor="m-int"><select id="m-int" className="field" {...register("membership.interval")}><option value="month">per month</option><option value="year">per year</option><option value="one_time">one time</option></select></Field>
          <Field label="Available now (one per line)" htmlFor="m-av" hint="Only list benefits that actually work today." className="md:col-span-3"><textarea id="m-av" rows={4} className="field" {...register("membership.available_benefits")} /></Field>
          <Field label="Coming soon (one per line)" htmlFor="m-pl" className="md:col-span-3"><textarea id="m-pl" rows={4} className="field" {...register("membership.planned_benefits")} /></Field>
        </div>
      </Panel>

      <Panel title="Contact & social">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Public contact email" htmlFor="ct-e" error={e.contact?.email?.message}><input id="ct-e" type="email" className="field" {...register("contact.email")} /></Field>
          <Field label="Phone" htmlFor="ct-p"><input id="ct-p" className="field" {...register("contact.phone")} /></Field>
          <Field label="Business address" htmlFor="ct-a" hint="Business address only, never an athlete or minor's location." className="md:col-span-2"><input id="ct-a" className="field" {...register("contact.address")} /></Field>
          {(["instagram", "x", "youtube", "facebook", "tiktok"] as const).map((s) => (
            <Field key={s} label={`${s === "x" ? "X" : s[0].toUpperCase() + s.slice(1)} URL`} htmlFor={`ct-${s}`} error={e.contact?.[s]?.message}><input id={`ct-${s}`} className="field" placeholder="https://" {...register(`contact.${s}`)} /></Field>
          ))}
        </div>
      </Panel>

      <Panel title="Sponsor packages">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Event sponsor from (USD)" htmlFor="sp-min" error={e.sponsor_packages?.min_dollars?.message}><input id="sp-min" inputMode="numeric" className="field" {...register("sponsor_packages.min_dollars")} /></Field>
          <Field label="Event sponsor up to" htmlFor="sp-max"><input id="sp-max" className="field" {...register("sponsor_packages.max_label")} /></Field>
          <Field label="Annual partner label" htmlFor="sp-ann"><input id="sp-ann" className="field" {...register("sponsor_packages.annual_partner_label")} /></Field>
          <Field label="Notes" htmlFor="sp-notes" className="md:col-span-3"><textarea id="sp-notes" rows={3} className="field" {...register("sponsor_packages.notes")} /></Field>
        </div>
      </Panel>

      <button type="submit" disabled={pending} className={adminBtn.primary}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Save site content</button>
    </form>
  );
}
