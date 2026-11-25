"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { rankingSchema } from "@/lib/validation/admin";
import { saveRanking } from "@/lib/actions/admin/rankings";
import { searchAthletesForPicker } from "@/lib/actions/admin/results";
import { Field } from "@/components/forms/field";
import { Panel, adminBtn } from "./ui";
import { POSITIONS, REGIONS } from "@/lib/site";
import { slugify } from "@/lib/format";

type Entry = { athlete_id: string; label: string; note: string; isPublic: boolean };
type Input = { title: string; slug: string; description: string; criteria: string; graduation_year: string; position: string; region: string };

export function RankingForm({ rankingId, initial, initialEntries }: { rankingId: string | null; initial: Input; initialEntries: Entry[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [term, setTerm] = useState("");
  const [options, setOptions] = useState<{ id: string; label: string; isPublic: boolean }[]>([]);
  const form = useForm<Input>({ resolver: zodResolver(rankingSchema.omit({ entries: true })) as never, defaultValues: initial });
  const { register, handleSubmit, setError, setValue, formState: { errors, touchedFields } } = form;
  const err = (k: keyof Input) => (errors[k] as { message?: string } | undefined)?.message;

  useEffect(() => {
    if (term.trim().length < 2) return;
    const t = setTimeout(async () => setOptions(await searchAthletesForPicker(term)), 250);
    return () => clearTimeout(t);
  }, [term]);

  const shownOptions = term.trim().length >= 2 ? options : [];
  const move = (i: number, d: -1 | 1) => setEntries((list) => { const j = i + d; if (j < 0 || j >= list.length) return list; const c = [...list]; [c[i], c[j]] = [c[j], c[i]]; return c; });

  const onSubmit = handleSubmit(() =>
    start(async () => {
      const res = await saveRanking(rankingId, { ...form.getValues(), entries: entries.map((e) => ({ athlete_id: e.athlete_id, note: e.note })) });
      if (!res.ok) {
        Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => setError(k as keyof Input, { message: m[0] }));
        return void toast.error(res.error);
      }
      toast.success("Ranking saved");
      if (!rankingId) router.replace(`/admin/rankings/${res.data.id}`);
      else router.refresh();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Panel title="Ranking details">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Title" htmlFor="rk-title" error={err("title")} required className="md:col-span-2"><input id="rk-title" className="field" {...register("title", { onChange: (e) => { if (!rankingId && !touchedFields.slug) setValue("slug", slugify(e.target.value)); } })} /></Field>
          <Field label="URL slug" htmlFor="rk-slug" error={err("slug")} required><input id="rk-slug" className="field" {...register("slug")} /></Field>
          <Field label="Class" htmlFor="rk-year" error={err("graduation_year")}><input id="rk-year" inputMode="numeric" className="field" {...register("graduation_year")} /></Field>
          <Field label="Position" htmlFor="rk-pos"><select id="rk-pos" className="field" {...register("position")}><option value="">All positions</option>{POSITIONS.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Region" htmlFor="rk-region"><select id="rk-region" className="field" {...register("region")}><option value="">All regions</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
          <Field label="Description" htmlFor="rk-desc" className="md:col-span-3"><textarea id="rk-desc" rows={2} className="field" {...register("description")} /></Field>
          <Field label="Ranking criteria (shown publicly)" htmlFor="rk-crit" error={err("criteria")} hint="Explain how athletes were evaluated. Rankings are editorial and separate from verified combine metrics." className="md:col-span-3" required><textarea id="rk-crit" rows={3} className="field" {...register("criteria")} /></Field>
        </div>
      </Panel>
      <Panel title="Athletes (in rank order)" description="Only approved, public athletes appear on the public ranking. Others stay hidden until approved.">
        <div className="relative mb-4 max-w-md">
          <input aria-label="Search athletes to add" className="field" placeholder="Search athletes to add…" value={term} onChange={(e) => setTerm(e.target.value)} autoComplete="off" />
          {shownOptions.length ? <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-white/15 bg-[#111113] shadow-xl">{shownOptions.map((o) => <li key={o.id}><button type="button" disabled={entries.some((e) => e.athlete_id === o.id)} className="block w-full px-3 py-2 text-left text-sm hover:bg-white/10 disabled:opacity-40" onClick={() => { setEntries((l) => [...l, { athlete_id: o.id, label: o.label, note: "", isPublic: o.isPublic }]); setTerm(""); setOptions([]); }}>{o.label}{o.isPublic ? "" : " (not public)"}</button></li>)}</ul> : null}
        </div>
        {entries.length ? (
          <ol className="space-y-2">
            {entries.map((e, i) => (
              <li key={e.athlete_id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 p-2.5">
                <span className="w-8 text-center font-display text-xl font-bold text-brand">{i + 1}</span>
                <span className="min-w-48 flex-1 text-sm">{e.label}{!e.isPublic ? <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] uppercase text-amber-300">hidden until public</span> : null}</span>
                <input aria-label={`Note for ${e.label}`} placeholder="Scouting note (optional)" className="field h-9 max-w-xs flex-1" maxLength={300} value={e.note} onChange={(ev) => setEntries((l) => l.map((x, k) => (k === i ? { ...x, note: ev.target.value } : x)))} />
                <button type="button" aria-label="Move up" className={adminBtn.secondary} onClick={() => move(i, -1)}><ArrowUp className="size-4" /></button>
                <button type="button" aria-label="Move down" className={adminBtn.secondary} onClick={() => move(i, 1)}><ArrowDown className="size-4" /></button>
                <button type="button" aria-label="Remove" className={adminBtn.secondary} onClick={() => setEntries((l) => l.filter((_, k) => k !== i))}><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ol>
        ) : <p className="text-sm text-white/50">No athletes yet.</p>}
      </Panel>
      <button type="submit" disabled={pending} className={adminBtn.primary}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Save ranking</button>
    </form>
  );
}
