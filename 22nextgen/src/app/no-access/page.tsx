import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { signOut } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "No admin access", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function NoAccess() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <ShieldAlert className="mb-4 size-10 text-amber-300" aria-hidden />
      <h1 className="font-display text-4xl font-extrabold uppercase">No admin access</h1>
      <p className="mt-3 text-white/70">This account is signed in but has no staff role. If you should have access, ask a 22 NEXT GEN Owner to grant one.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">Back to site</Link>
        <form action={signOut}><button type="submit" className="rounded-md border border-white/20 px-4 py-2 text-sm font-semibold">Sign out</button></form>
      </div>
    </main>
  );
}
