import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";

export default function Forbidden() {
  return (
    <div>
      <AdminPageHeader title="Access restricted" description="Your role does not include access to that area." />
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center"><ShieldAlert className="mx-auto mb-3 size-8 text-amber-300" /><p className="text-white/70">If you believe you need access, ask an Owner to update your role.</p><Link href="/admin" className="mt-4 inline-block text-brand underline underline-offset-4">Back to overview</Link></div>
    </div>
  );
}
