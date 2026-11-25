"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addResult, searchAthletesForPicker } from "@/lib/actions/admin/results";
import { Field } from "@/components/forms/field";
import { adminBtn } from "./ui";

type Opt = { id: string; label: string };

export function ResultForm({ events, tests, canVerify, defaultAthlete, defaultEvent }: { events: Opt[]; tests: { id: string; name: string; unit: string }[]; canVerify: boolean; defaultAthlete?: Opt | null; defaultEvent?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [athlete, setAthlete] = useState<Opt | null>(defaultAthlete ?? null);
  const [term, setTerm] = useState("");
  const [options, setOptions] = useState<Opt[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (term.trim().length < 2) return void setOptions([]);
    const t = setTimeout(async () => setOptions(await searchAthletesForPicker(term)), 250);
    return () => clearTimeout(t);
  }, [term]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      athlete_id: athlete?.id ?? "", event_id: fd.get("event_id"), test_type_id: fd.get("test_type_id"), value: fd.get("value"),
      attempt_number: fd.get("attempt_number"), protocol: fd.get("protocol"), tested_on: fd.get("tested_on"), notes: fd.get("notes"),
    };
    start(async () => {
      const res = await addResult(payload, canVerify && fd.get("verify") === "on");
      if (!res.ok) {
        setErrors(Object.fromEntries(Object.entries(res.fieldErrors ?? {}).map(([k, v]) => [k, v[0]])));
        return void toast.error(res.error);
      }
      setErrors({});
      toast.success("Result added");
      (form.elements.namedItem("value") as HTMLInputElement).value = "";
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-3" noValidate>
      <div className="md:col-span-3">
        <Field label="Athlete" htmlFor="r-athlete" error={errors.athlete_id} required>
          {athlete ? (
            <div className="flex items-center gap-3"><span className="rounded-md border border-brand/40 bg-brand/10 px-3 py-2 text-sm">{athlete.label}</span><button type="button" className="text-xs text-white/50 underline" onClick={() => { setAthlete(null); setTerm(""); }}>Change</button></div>
          ) : (
            <div className="relative">
              <input id="r-athlete" className="field" placeholder="Search by first or last name…" value={term} onChange={(e) => setTerm(e.target.value)} autoComplete="off" />
              {options.length ? <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-white/15 bg-[#111113] shadow-xl">{options.map((o) => <li key={o.id}><button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-white/10" onClick={() => { setAthlete(o); setOptions([]); }}>{o.label}</button></li>)}</ul> : null}
            </div>
          )}
        </Field>
      </div>
      <Field label="Event" htmlFor="r-event" error={errors.event_id} required><select id="r-event" name="event_id" className="field" defaultValue={defaultEvent ?? ""}><option value="">Select…</option>{events.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}</select></Field>
      <Field label="Test" htmlFor="r-test" error={errors.test_type_id} required><select id="r-test" name="test_type_id" className="field" defaultValue=""><option value="">Select…</option>{tests.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.unit})</option>)}</select></Field>
      <Field label="Result" htmlFor="r-value" error={errors.value} hint={`Seconds, inches, or feet-inches like 7'2"`} required><input id="r-value" name="value" className="field" inputMode="decimal" /></Field>
      <Field label="Attempt" htmlFor="r-attempt" error={errors.attempt_number}><input id="r-attempt" name="attempt_number" className="field" defaultValue="1" inputMode="numeric" /></Field>
      <Field label="Protocol" htmlFor="r-protocol" hint="e.g. laser, hand. Different protocols never mix on leaderboards."><input id="r-protocol" name="protocol" className="field" defaultValue="standard" /></Field>
      <Field label="Test date" htmlFor="r-date" error={errors.tested_on}><input id="r-date" name="tested_on" type="date" className="field" /></Field>
      <Field label="Notes" htmlFor="r-notes" className="md:col-span-3"><input id="r-notes" name="notes" className="field" /></Field>
      {canVerify ? <label className="flex items-center gap-2 text-sm md:col-span-3"><input type="checkbox" name="verify" className="accent-[#147dff]" />Mark as verified now (shows on public leaderboards)</label> : <p className="text-xs text-white/45 md:col-span-3">Results are saved as unverified until an admin verifies them.</p>}
      <div className="md:col-span-3"><button type="submit" disabled={pending} className={adminBtn.primary}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Add result</button></div>
    </form>
  );
}
