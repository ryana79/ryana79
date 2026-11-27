"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseCsvText } from "@/lib/import/parse";
import { applyTurkeyBowlImport, previewTurkeyBowlImport } from "@/lib/actions/admin/leads";
import { adminBtn, Notice } from "./ui";

const FIELDS = [
  { key: "name", label: "Parent or guardian name", required: true },
  { key: "email", label: "Parent or guardian email", required: true },
  { key: "town", label: "Town", required: false },
  { key: "grade", label: "Grade", required: false },
  { key: "permission", label: "Marketing permission", required: false },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];
type Preview = { rows: { line: number; email: string | null; name: string | null; status: string; reason: string }[]; valid: number; duplicates: number; skipped: number };

function guess(headers: string[], label: string) {
  const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const wanted = norm(label);
  return headers.find((header) => norm(header) === wanted || norm(header).includes(wanted)) ?? "";
}

export function LeadImport() {
  const [pending, start] = useTransition();
  const [headers, setHeaders] = useState<string[]>([]);
  const [table, setTable] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({ name: "", email: "", town: "", grade: "", permission: "" });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<{ created: number; matched: number } | null>(null);

  const rows = useMemo(() => {
    return table.map((cells, index) => {
      const value = (key: FieldKey) => {
        const header = mapping[key];
        const at = headers.indexOf(header);
        return at >= 0 ? (cells[at] ?? "").trim() : "";
      };
      return { line: index + 2, name: value("name"), email: value("email"), town: value("town"), grade: value("grade"), permission: value("permission") };
    }).filter((row) => row.name || row.email || row.town || row.grade || row.permission);
  }, [table, headers, mapping]);

  const onFile = async (file: File | undefined) => {
    setPreview(null);
    setResult(null);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("That file is larger than 5 MB.");
      return;
    }
    const text = await file.text();
    const parsed = parseCsvText(text).filter((row) => row.some((cell) => cell.trim()));
    if (parsed.length < 2) {
      toast.error("The CSV needs a header row and at least one contact.");
      return;
    }
    const nextHeaders = parsed[0].map((header) => header.trim());
    setHeaders(nextHeaders);
    setTable(parsed.slice(1));
    setMapping({
      name: guess(nextHeaders, "parent name") || guess(nextHeaders, "guardian name") || guess(nextHeaders, "name"),
      email: guess(nextHeaders, "parent email") || guess(nextHeaders, "email"),
      town: guess(nextHeaders, "town") || guess(nextHeaders, "city"),
      grade: guess(nextHeaders, "grade"),
      permission: guess(nextHeaders, "marketing") || guess(nextHeaders, "permission") || guess(nextHeaders, "opt in"),
    });
  };

  const runPreview = () => start(async () => {
    const res = await previewTurkeyBowlImport(rows);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setPreview(res.data);
  });

  const runImport = () => start(async () => {
    const res = await applyTurkeyBowlImport(rows);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setResult(res.data);
    toast.success(`Imported ${res.data.created + res.data.matched} contacts.`);
  });

  return (
    <div className="space-y-6">
      <label className="block rounded-xl border border-dashed border-white/15 p-6 text-sm text-white/70">
        <span className="mb-2 block font-medium text-white">Turkey Bowl 2026 registration export</span>
        <input type="file" accept=".csv,text/csv" className="block w-full text-sm" onChange={(event) => onFile(event.target.files?.[0])} />
        <span className="mt-2 block text-xs text-white/40">CSV only. Map the parent columns. Athlete details in other columns are not saved.</span>
      </label>

      {headers.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <label key={field.key} className="text-sm">
              <span className="mb-1 block text-white/70">{field.label}{field.required ? " *" : ""}</span>
              <select className="field" value={mapping[field.key]} onChange={(event) => { setMapping((current) => ({ ...current, [field.key]: event.target.value })); setPreview(null); }}>
                <option value="">{field.required ? "Choose a column" : "Not in this file"}</option>
                {headers.map((header) => <option key={header} value={header}>{header}</option>)}
              </select>
            </label>
          ))}
        </div>
      ) : null}

      {headers.length ? <button type="button" className={adminBtn.primary} disabled={pending || !mapping.name || !mapping.email} onClick={runPreview}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Preview import</button> : null}

      {preview ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Notice tone="green" title={`${preview.valid} valid`}>{preview.valid === 1 ? "1 new contact" : `${preview.valid} new contacts`}</Notice>
            <Notice tone="amber" title={`${preview.duplicates} duplicates`}>These match an existing email or repeat in the file. They update the contact and keep current interests.</Notice>
            <Notice tone="red" title={`${preview.skipped} skipped`}>Missing a usable parent name or email. These are not imported.</Notice>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/40">
                <tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Why</th></tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 50).map((row) => (
                  <tr key={row.line} className="border-b border-white/[0.06]">
                    <td className="px-3 py-2">{row.line}</td>
                    <td className="px-3 py-2">{row.email || "—"}</td>
                    <td className="px-3 py-2 uppercase">{row.status}</td>
                    <td className="px-3 py-2 text-white/60">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rows.length > 50 ? <p className="text-xs text-white/40">Showing the first 50 rows. The import still uses every row.</p> : null}
          <button type="button" className={adminBtn.primary} disabled={pending || preview.valid + preview.duplicates === 0} onClick={runImport}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Import {preview.valid + preview.duplicates} contacts</button>
        </div>
      ) : null}

      {result ? <Notice tone="green" title="Import finished">{result.created} created, {result.matched} matched. No event interests were added.</Notice> : null}
    </div>
  );
}
