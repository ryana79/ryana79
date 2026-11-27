import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/auth-forms";
import { getCurrentUser } from "@/lib/auth";
import { hasAnyRole, ROLE_GROUPS } from "@/lib/permissions";
import { safeNext } from "@/lib/validation/public";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(safeNext(next, hasAnyRole(user.roles, ROLE_GROUPS.staff) ? "/admin" : "/dashboard"));
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold uppercase">Log in</h1>
      <p className="mb-6 mt-1 text-sm text-white/55">Access your 22 NEXT GEN account.</p>
      <LoginForm next={next} />
    </>
  );
}
