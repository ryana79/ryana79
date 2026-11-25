"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { stageImport } from "@/lib/actions/admin/imports";
import { Field } from "@/components/forms/field";
import { adminBtn } from "./ui";

export function ImportUpload({ events }: { events: { id: string; title: string; event_date: string | null }[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<"athletes" | "combine_results">("athletes");
  const [sheets, setSheets] = useState<string[] | null>(null);
  const [fileName, setFileName] = useState("");

  const submit = () => {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    start(async () => {
      const res = await stageImport(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if ("needsSheet" in res.data) {
        setSheets(res.data.needsSheet);
        toast.message("This workbook has several sheets. Choose one to import.");
        return;
      }
      toast.success("File read. Review the column mapping next.");
      router.push(`/admin/imports/${res.data.batchId}`);
    });
  };

  return (
    <form ref={formRef} onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid gap-4 md:grid-cols-2">
      <fieldset className="md:col-span-2">
        <legend className="mb-1.5 text-sm font-medium">What are you importing?</legend>
        <div className="flex flex-wrap gap-3">
          {([["athletes", "Athletes"], ["combine_results", "Combine results"]] as const).map(([v, l]) => (
            <label key={v} className="flex cursor-pointer items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/15">
              <input type="radio" name="kind" value={v} checked={kind === v} onChange={() => setKind(v)} className="accent-[#147dff]" />{l}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Spreadsheet (.xlsx or .csv, up to 5 MB)" htmlFor="imp-file" className="md:col-span-2">
        <input id="imp-file" name="file" type="file" required accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => { setFileName(e.target.files?.[0]?.name ?? ""); setSheets(null); }} className="field file:mr-3 file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:text-white" />
      </Field>
      {kind === "combine_results" ? (
        <Field label="Event" htmlFor="imp-event" hint="Results are attached to this event." required>
          <select id="imp-event" name="event_id" required className="field"><option value="">Select event…</option>{events.map((e) => <option key={e.id} value={e.id}>{e.title}{e.event_date ? ` · ${e.event_date}` : ""}</option>)}</select>
        </Field>
      ) : (
        <Field label="Register athletes for event (optional)" htmlFor="imp-event2" hint="Adds event participation for every imported athlete.">
          <select id="imp-event2" name="event_id" className="field"><option value="">No event</option>{events.map((e) => <option key={e.id} value={e.id}>{e.title}{e.event_date ? ` · ${e.event_date}` : ""}</option>)}</select>
        </Field>
      )}
      <Field label="Source system label" htmlFor="imp-source" hint="Used to remember external IDs, e.g. “colin-master-sheet”.">
        <input id="imp-source" name="source_system" defaultValue="spreadsheet" className="field" maxLength={60} />
      </Field>
      {sheets ? (
        <Field label={`Worksheet in ${fileName}`} htmlFor="imp-sheet" className="md:col-span-2">
          <select id="imp-sheet" name="sheet" required className="field">{sheets.map((s) => <option key={s}>{s}</option>)}</select>
        </Field>
      ) : null}
      <div className="md:col-span-2">
        <button type="submit" disabled={pending} className={adminBtn.primary}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{sheets ? "Continue with sheet" : "Upload & read file"}</button>
      </div>
    </form>
  );
}
