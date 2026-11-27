"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { applyImport } from "@/lib/actions/admin/imports";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { adminBtn } from "./ui";

const MODES = {
  athletes: [
    ["add_and_update", "Add new and update matched"],
    ["add_new", "Add new only"],
    ["update_matched", "Update matched only"],
    ["preview_only", "Preview only (no changes)"],
  ],
  combine_results: [
    ["add_new", "Add results for matched athletes"],
    ["preview_only", "Preview only (no changes)"],
  ],
} as const;

export function ImportApply({ batchId, kind, unresolved }: { batchId: string; kind: "athletes" | "combine_results"; unresolved: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<string>(MODES[kind][0][0]);
  const [overwrite, setOverwrite] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      const res = await applyImport(batchId, mode, overwrite);
      setOpen(false);
      if (!res.ok) return void toast.error(res.error);
      const r = res.data.result;
      toast.success(mode === "preview_only" ? "Preview recorded. Nothing was changed." : `Import applied: ${r.created ?? 0} added, ${r.updated ?? 0} updated, ${r.skipped ?? 0} skipped, ${r.failed ?? 0} failed.`);
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="imp-mode" className="mb-1 block text-sm font-medium">Import mode</label>
          <select id="imp-mode" className="field" value={mode} onChange={(e) => setMode(e.target.value)}>{MODES[kind].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
        {kind === "athletes" ? (
          <label className="flex items-start gap-2 self-end text-sm">
            <input type="checkbox" className="mt-1 accent-[#147dff]" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
            <span>Allow overwriting fields on <strong>approved</strong> profiles <span className="text-white/45">(off by default: approved profile data is preserved and only empty fields are filled)</span></span>
          </label>
        ) : null}
      </div>
      {unresolved > 0 ? <p className="text-sm text-amber-300">{unresolved} possible duplicate row(s) are unresolved and will be skipped unless you resolve them above.</p> : null}
      <button type="button" disabled={pending} onClick={() => (mode === "preview_only" ? run() : setOpen(true))} className={adminBtn.primary}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}{mode === "preview_only" ? "Record preview" : "Apply import"}</button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply this import?</AlertDialogTitle>
            <AlertDialogDescription>
              {kind === "athletes" ? "New athletes are created as private drafts with no consent. Nothing is published automatically." : "Results are added as unverified. They appear on public leaderboards only after an admin verifies them."} This can be applied only once.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <button type="button" disabled={pending} onClick={run} className={adminBtn.primary}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Apply import</button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
