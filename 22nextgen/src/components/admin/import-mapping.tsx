"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { savePreview, saveMappingPreset, deleteMappingPreset } from "@/lib/actions/admin/imports";
import type { FieldDef, Mapping } from "@/lib/import/fields";
import { adminBtn } from "./ui";

const GROUPS: Record<string, string> = { identity: "Identity", public: "Public profile fields", private: "Private fields (admin only)", result: "Test results", meta: "Result details" };

export function ImportMapping({ batchId, kind, headers, fields, initial, sourceSystem, presets }: { batchId: string; kind: string; headers: string[]; fields: FieldDef[]; initial: Mapping; sourceSystem: string; presets: { id: string; name: string; mapping: Mapping }[] }) {
  const router = useRouter();
  const [mapping, setMapping] = useState<Mapping>(initial);
  const [source, setSource] = useState(sourceSystem);
  const [presetName, setPresetName] = useState("");
  const [pending, start] = useTransition();

  const set = (key: string, value: string) => setMapping((m) => ({ ...m, [key]: value || null }));
  const usedTwice = new Set(Object.values(mapping).filter(Boolean).filter((v, i, a) => a.indexOf(v) !== i));

  const run = () =>
    start(async () => {
      const res = await savePreview(batchId, mapping, source);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Preview updated.");
      router.refresh();
    });

  const grouped = Object.entries(GROUPS).map(([g, label]) => ({ label, items: fields.filter((f) => f.group === g) })).filter((g) => g.items.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="preset" className="mb-1 block text-xs text-white/50">Load saved mapping</label>
          <select id="preset" className="field h-10 w-56" defaultValue="" onChange={(e) => { const p = presets.find((x) => x.id === e.target.value); if (p) { setMapping(Object.fromEntries(Object.entries(p.mapping).filter(([, v]) => headers.includes(v as string)))); toast.message(`Loaded “${p.name}”. Columns missing from this file were ignored.`); } }}>
            <option value="">Choose preset…</option>
            {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="source" className="mb-1 block text-xs text-white/50">Source system label</label>
          <input id="source" className="field h-10 w-56" value={source} onChange={(e) => setSource(e.target.value)} maxLength={60} />
        </div>
      </div>

      {usedTwice.size ? <p role="alert" className="text-sm text-amber-300">The same column is mapped to more than one field. This is allowed, but double-check.</p> : null}

      {grouped.map((g) => (
        <fieldset key={g.label}>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">{g.label}</legend>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {g.items.map((f) => (
              <div key={f.key}>
                <label htmlFor={`map-${f.key}`} className="mb-1 block text-sm">{f.label}</label>
                <select id={`map-${f.key}`} className="field" value={mapping[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">— not imported —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                {f.hint ? <p className="mt-0.5 text-xs text-white/40">{f.hint}</p> : null}
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
        <button type="button" onClick={run} disabled={pending} className={adminBtn.primary}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Validate &amp; preview</button>
        <input aria-label="Preset name" placeholder="Save mapping as…" className="field h-10 w-56" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
        <button type="button" disabled={pending || !presetName.trim()} className={adminBtn.secondary} onClick={() => start(async () => { const r = await saveMappingPreset(kind, presetName, mapping); if (!r.ok) return void toast.error(r.error); toast.success("Mapping preset saved"); setPresetName(""); router.refresh(); })}>Save preset</button>
        {presets.length ? <select aria-label="Delete preset" className="field h-10 w-44" defaultValue="" onChange={(e) => { const id = e.target.value; if (!id) return; start(async () => { const r = await deleteMappingPreset(id); if (!r.ok) return void toast.error(r.error); toast.success("Preset deleted"); router.refresh(); }); e.target.value = ""; }}><option value="">Delete preset…</option>{presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select> : null}
      </div>
    </div>
  );
}
