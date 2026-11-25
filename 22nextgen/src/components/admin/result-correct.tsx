"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { correctResult } from "@/lib/actions/admin/results";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { adminBtn } from "./ui";

export function ResultCorrect({ id, current, unit }: { id: string; current: string; unit: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();
  const submit = () =>
    start(async () => {
      const res = await correctResult(id, value, notes);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Correction recorded. The previous value is kept in history and the new value needs verification.");
      setOpen(false);
      router.refresh();
    });
  return (
    <>
      <button type="button" className={adminBtn.secondary} onClick={() => setOpen(true)}>Correct</button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Correct result</AlertDialogTitle>
            <AlertDialogDescription>The original value is preserved in history. The corrected value starts as unverified.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div><label htmlFor="corr-value" className="mb-1 block text-sm">New value ({unit})</label><input id="corr-value" className="field" value={value} onChange={(e) => setValue(e.target.value)} /></div>
            <div><label htmlFor="corr-notes" className="mb-1 block text-sm">Reason</label><input id="corr-notes" className="field" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <button type="button" disabled={pending} onClick={submit} className={adminBtn.primary}>Save correction</button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
