"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sponsorSchema, type SponsorFormInput } from "@/lib/validation/admin";
import { saveSponsor } from "@/lib/actions/admin/sponsors";
import { Field } from "@/components/forms/field";
import { Panel, adminBtn } from "./ui";
import { ImageField } from "./image-field";
import { SPONSOR_TIERS } from "@/lib/site";

export const EMPTY_SPONSOR: SponsorFormInput = { name: "", website_url: "", description: "", tier: "partner", category: "", logo_path: "", featured: false, active: true, sort_order: "100" };

export function SponsorForm({ sponsorId, initial }: { sponsorId: string | null; initial: SponsorFormInput }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useForm<SponsorFormInput>({ resolver: zodResolver(sponsorSchema) as never, defaultValues: initial });
  const { register, control, handleSubmit, setError, formState: { errors } } = form;
  const err = (k: keyof SponsorFormInput) => (errors[k] as { message?: string } | undefined)?.message;

  const onSubmit = handleSubmit(() =>
    start(async () => {
      const res = await saveSponsor(sponsorId, form.getValues());
      if (!res.ok) {
        Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => setError(k as keyof SponsorFormInput, { message: m[0] }));
        toast.error(res.error);
        return;
      }
      toast.success("Sponsor saved");
      if (!sponsorId) router.replace(`/admin/sponsors/${res.data.id}`);
      else router.refresh();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Panel title="Sponsor details">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name" htmlFor="sp-name" error={err("name")} required><input id="sp-name" className="field" {...register("name")} /></Field>
          <Field label="Website" htmlFor="sp-web" error={err("website_url")}><input id="sp-web" className="field" placeholder="https://" {...register("website_url")} /></Field>
          <Field label="Tier" htmlFor="sp-tier"><select id="sp-tier" className="field" {...register("tier")}>{SPONSOR_TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
          <Field label="Category" htmlFor="sp-cat" hint="e.g. Training, Apparel, Local business"><input id="sp-cat" className="field" {...register("category")} /></Field>
          <Field label="Description" htmlFor="sp-desc" error={err("description")} className="md:col-span-2"><textarea id="sp-desc" rows={3} className="field" {...register("description")} /></Field>
          <Field label="Sort order" htmlFor="sp-sort" error={err("sort_order")} hint="Lower numbers appear first."><input id="sp-sort" inputMode="numeric" className="field" {...register("sort_order")} /></Field>
          <div className="flex flex-col justify-end gap-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#147dff]" {...register("active")} />Active (show on the public site)</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#147dff]" {...register("featured")} />Featured on the homepage</label>
          </div>
        </div>
      </Panel>
      <Panel title="Logo" description="Use a logo supplied by the sponsor. Transparent PNG, SVG-free (raster only), under 5 MB.">
        <Controller control={control} name="logo_path" render={({ field }) => <ImageField label="Logo" folder="sponsors" value={field.value} onChange={field.onChange} />} />
      </Panel>
      <button type="submit" disabled={pending} className={adminBtn.primary}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Save sponsor</button>
    </form>
  );
}
