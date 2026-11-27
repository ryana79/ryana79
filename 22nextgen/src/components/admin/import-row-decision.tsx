"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setRowDecision } from "@/lib/actions/admin/imports";

type Candidate = { athlete_id: string; label: string; score: number };

export function ImportRowDecision({ rowId, current, currentTarget, candidates, canCreate }: { rowId: string; current: string | null; currentTarget: string | null; candidates: Candidate[]; canCreate: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const value = current === "link" ? `link:${currentTarget ?? candidates[0]?.athlete_id ?? ""}` : current ?? "";

  const onChange = (v: string) =>
    start(async () => {
      const [decision, athleteId] = v.split(":");
      const res = await setRowDecision({ rowId, decision, athleteId: athleteId || null });
      if (!res.ok) return void toast.error(res.error);
      router.refresh();
    });

  return (
    <select aria-label="Resolve row" disabled={pending} value={value} onChange={(e) => onChange(e.target.value)} className="field h-9 min-w-56 text-xs">
      <option value="" disabled>Choose…</option>
      {canCreate ? <option value="create">Create as new athlete</option> : null}
      {candidates.map((c) => <option key={c.athlete_id} value={`link:${c.athlete_id}`}>Link to {c.label} ({c.score}%)</option>)}
      <option value="skip">Skip this row</option>
    </select>
  );
}
