"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { athleteSchema, type AthleteFormInput } from "@/lib/validation/admin";
import { saveAthlete } from "@/lib/actions/admin/athletes";
import { Field } from "@/components/forms/field";
import { Notice, Panel, adminBtn } from "./ui";
import { ImageField } from "./image-field";
import { POSITIONS, REGIONS, US_STATES } from "@/lib/site";

export const EMPTY_ATHLETE: AthleteFormInput = {
  first_name: "", last_name: "", display_name: "", profile_image_path: "", graduation_year: "", current_grade: "", primary_position: "", secondary_position: "",
  team: "", school_public: "", school: "", town: "", state: "NJ", region: "", height_in: "", weight_lb: "", highlight_urls: "", awards: "", achievements: "", bio: "",
  featured_rank: "", birth_date: "", parent_name: "", parent_email: "", parent_phone: "", internal_notes: "",
};

export function AthleteForm({ athleteId, initial }: { athleteId: string | null; initial: AthleteFormInput }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useForm<AthleteFormInput>({ resolver: zodResolver(athleteSchema) as never, defaultValues: initial });
  const { register, control, handleSubmit, setError, formState: { errors } } = form;
  const err = (k: keyof AthleteFormInput) => (errors[k] as { message?: string } | undefined)?.message;

  const onSubmit = handleSubmit(
    () =>
      start(async () => {
        const res = await saveAthlete(athleteId, form.getValues());
        if (!res.ok) {
          Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => setError(k as keyof AthleteFormInput, { message: m[0] }));
          toast.error(res.error);
          return;
        }
        toast.success("Athlete saved");
        if (!athleteId) router.replace(`/admin/athletes/${res.data.id}`);
        else router.refresh();
      }),
    () => toast.error("Please fix the highlighted fields."),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Panel title="Public profile fields" description="These appear on the public profile only after the athlete is approved with recorded guardian consent.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="First name" htmlFor="a-fn" error={err("first_name")} required><input id="a-fn" className="field" {...register("first_name")} /></Field>
          <Field label="Last name" htmlFor="a-ln" error={err("last_name")} required><input id="a-ln" className="field" {...register("last_name")} /></Field>
          <Field label="Display name" htmlFor="a-dn" hint="Optional nickname or preferred name."><input id="a-dn" className="field" {...register("display_name")} /></Field>
          <Field label="Graduation class" htmlFor="a-gy" error={err("graduation_year")}><input id="a-gy" inputMode="numeric" className="field" placeholder="2031" {...register("graduation_year")} /></Field>
          <Field label="Current grade" htmlFor="a-gr" error={err("current_grade")}><input id="a-gr" inputMode="numeric" className="field" {...register("current_grade")} /></Field>
          <Field label="Team / club" htmlFor="a-team"><input id="a-team" className="field" {...register("team")} /></Field>
          <Field label="Primary position" htmlFor="a-p1" error={err("primary_position")}><select id="a-p1" className="field" {...register("primary_position")}><option value="">—</option>{POSITIONS.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Secondary position" htmlFor="a-p2" error={err("secondary_position")}><select id="a-p2" className="field" {...register("secondary_position")}><option value="">—</option>{POSITIONS.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="School (shown publicly)" htmlFor="a-sp" hint="Leave blank to hide the school."><input id="a-sp" className="field" {...register("school_public")} /></Field>
          <Field label="Town" htmlFor="a-town" hint="Town only. Never a street address."><input id="a-town" className="field" {...register("town")} /></Field>
          <Field label="State" htmlFor="a-state" error={err("state")}><select id="a-state" className="field" {...register("state")}><option value="">—</option>{US_STATES.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Region" htmlFor="a-region"><select id="a-region" className="field" {...register("region")}><option value="">—</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
          <Field label="Height (inches)" htmlFor="a-h" error={err("height_in")}><input id="a-h" inputMode="decimal" className="field" placeholder="68" {...register("height_in")} /></Field>
          <Field label="Weight (lb)" htmlFor="a-w" error={err("weight_lb")}><input id="a-w" inputMode="decimal" className="field" {...register("weight_lb")} /></Field>
          <Field label="Featured order" htmlFor="a-fr" error={err("featured_rank")} hint="Lower shows first."><input id="a-fr" inputMode="numeric" className="field" {...register("featured_rank")} /></Field>
          <Field label="Bio" htmlFor="a-bio" error={err("bio")} className="md:col-span-3"><textarea id="a-bio" rows={4} className="field" {...register("bio")} /></Field>
          <Field label="Awards (one per line)" htmlFor="a-aw" className="md:col-span-3 md:col-span-1"><textarea id="a-aw" rows={4} className="field" {...register("awards")} /></Field>
          <Field label="Achievements (one per line)" htmlFor="a-ach" className="md:col-span-2"><textarea id="a-ach" rows={4} className="field" {...register("achievements")} /></Field>
          <Field label="Highlight video links (one per line, https only)" htmlFor="a-hl" error={err("highlight_urls")} hint="YouTube or Vimeo links embed automatically." className="md:col-span-3"><textarea id="a-hl" rows={3} className="field" {...register("highlight_urls")} /></Field>
          <div className="md:col-span-3"><Controller control={control} name="profile_image_path" render={({ field }) => <ImageField label="Profile photo" hint="Only upload photos with guardian permission. Files are stored in a public bucket under an unguessable name; they are only linked from the site once the profile is public." folder="athletes" value={field.value} onChange={field.onChange} />} /></div>
        </div>
      </Panel>

      <Panel title="Private fields" description="Admin-only. Never shown publicly or included in public API responses.">
        <div className="mb-4"><Notice tone="amber" title="Youth privacy">Collect only what is needed. Birth date is used for age eligibility checks (athletes under 13 cannot be published).</Notice></div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Birth date" htmlFor="a-bd" error={err("birth_date")}><input id="a-bd" type="date" className="field" {...register("birth_date")} /></Field>
          <Field label="School (private)" htmlFor="a-school"><input id="a-school" className="field" {...register("school")} /></Field>
          <span />
          <Field label="Parent / guardian name" htmlFor="a-pn"><input id="a-pn" className="field" {...register("parent_name")} /></Field>
          <Field label="Parent email" htmlFor="a-pe" error={err("parent_email")}><input id="a-pe" type="email" className="field" {...register("parent_email")} /></Field>
          <Field label="Parent phone" htmlFor="a-pp"><input id="a-pp" className="field" {...register("parent_phone")} /></Field>
          <Field label="Internal notes" htmlFor="a-notes" className="md:col-span-3"><textarea id="a-notes" rows={3} className="field" {...register("internal_notes")} /></Field>
        </div>
      </Panel>

      <button type="submit" disabled={pending} className={adminBtn.primary}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Save athlete</button>
    </form>
  );
}
