"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { adminBtn } from "./ui";
import { cn } from "@/lib/utils";

type Props = {
  action: () => Promise<{ ok: boolean; error?: string } | void>;
  label: string;
  variant?: keyof typeof adminBtn;
  confirm?: { title: string; description: string; confirmLabel?: string };
  successMessage?: string;
  className?: string;
  icon?: React.ReactNode;
  redirectTo?: string;
};

/** Runs a server action with an optional confirmation dialog, loading state and toast feedback. */
export function ActionButton({ action, label, variant = "secondary", confirm, successMessage, className, icon, redirectTo }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  const run = () =>
    start(async () => {
      try {
        const res = await action();
        if (res && "ok" in res && !res.ok) {
          toast.error(res.error ?? "Action failed");
          setOpen(false);
          return;
        }
        toast.success(successMessage ?? `${label} done`);
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      } catch (e) {
        if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
        toast.error("Something went wrong. Please try again.");
        setOpen(false);
      }
    });

  return (
    <>
      <button type="button" disabled={pending} onClick={() => (confirm ? setOpen(true) : run())} className={cn(adminBtn[variant], className)}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : icon}{label}
      </button>
      {confirm ? (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <button type="button" disabled={pending} onClick={run} className={cn(variant === "danger" ? adminBtn.danger : adminBtn.primary)}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}{confirm.confirmLabel ?? "Confirm"}
              </button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}
