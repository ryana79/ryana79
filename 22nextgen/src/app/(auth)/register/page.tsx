import type { Metadata } from "next";
import { RegisterForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default function RegisterPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold uppercase">Create account</h1>
      <p className="mb-2 mt-1 text-sm text-white/55">For parents, guardians and adult users.</p>
      <p className="mb-6 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-white/55">
        Athlete profiles are created and published by 22 NEXT GEN staff after registration and recorded parental consent. Guardian dashboards for managing athletes are coming later. An account does not make any child&apos;s information public.
      </p>
      <RegisterForm />
    </>
  );
}
