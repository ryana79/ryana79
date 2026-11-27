"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { signInSchema, signUpSchema } from "@/lib/validation/public";
import { signIn, signUp } from "@/lib/actions/auth";
import { Field } from "./field";
import { Btn } from "@/components/site/btn";

type SignIn = z.infer<typeof signInSchema>;

export function LoginForm({ next }: { next?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<SignIn>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "", next } });
  const onSubmit = (v: SignIn) =>
    start(async () => {
      setError(null);
      const res = await signIn(v); // redirects on success
      if (res && !res.ok) setError(res.error);
    });
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Field label="Email" htmlFor="login-email" error={errors.email?.message}><input id="login-email" type="email" autoComplete="email" className="field" {...register("email")} /></Field>
      <Field label="Password" htmlFor="login-password" error={errors.password?.message}><input id="login-password" type="password" autoComplete="current-password" className="field" {...register("password")} /></Field>
      {error ? <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
      <Btn type="submit" disabled={pending} className="w-full">{pending ? <Loader2 className="size-4 animate-spin" /> : null}Log in</Btn>
      <p className="text-center text-sm text-white/55">No account? <Link href="/register" className="text-brand underline underline-offset-4">Create one</Link></p>
    </form>
  );
}

type SignUp = z.input<typeof signUpSchema>;

export function RegisterForm() {
  const [pending, start] = useTransition();
  const [needsConfirmation, setNeedsConfirmation] = useState<boolean | null>(null);
  const { register, handleSubmit, setError, formState: { errors } } = useForm<SignUp>({ resolver: zodResolver(signUpSchema) });
  const onSubmit = (v: SignUp) =>
    start(async () => {
      const res = await signUp(v);
      if (!res.ok) {
        Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => setError(k as keyof SignUp, { message: m[0] }));
        toast.error(res.error);
        return;
      }
      setNeedsConfirmation(res.data.needsConfirmation);
    });
  if (needsConfirmation !== null) {
    return (
      <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-100">
        <p className="font-semibold">Account created.</p>
        <p className="mt-1 text-sm">{needsConfirmation ? "Check your email to confirm your address, then log in." : "You can log in now."}</p>
        <Link href="/login" className="mt-3 inline-block text-sm text-white underline underline-offset-4">Go to log in</Link>
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Field label="Your name" htmlFor="reg-name" error={errors.display_name?.message} required><input id="reg-name" autoComplete="name" className="field" {...register("display_name")} /></Field>
      <Field label="Email" htmlFor="reg-email" error={errors.email?.message} required><input id="reg-email" type="email" autoComplete="email" className="field" {...register("email")} /></Field>
      <Field label="Password" htmlFor="reg-password" error={errors.password?.message} hint="At least 10 characters." required><input id="reg-password" type="password" autoComplete="new-password" className="field" {...register("password")} /></Field>
      <label className="flex items-start gap-3 text-sm text-white/70"><input type="checkbox" className="mt-1 size-4 accent-[#147dff]" {...register("is_adult")} /><span>I am a parent, guardian or an adult (18+). Accounts for children under 18 are created and controlled by a parent or guardian.</span></label>
      {errors.is_adult ? <p role="alert" className="text-xs text-red-300">{errors.is_adult.message}</p> : null}
      <label className="flex items-start gap-3 text-sm text-white/70"><input type="checkbox" className="mt-1 size-4 accent-[#147dff]" {...register("accept_terms")} /><span>I agree to the <Link href="/terms" className="text-brand underline underline-offset-4">Terms</Link> and <Link href="/privacy" className="text-brand underline underline-offset-4">Privacy Policy</Link>.</span></label>
      {errors.accept_terms ? <p role="alert" className="text-xs text-red-300">{errors.accept_terms.message}</p> : null}
      <Btn type="submit" disabled={pending} className="w-full">{pending ? <Loader2 className="size-4 animate-spin" /> : null}Create account</Btn>
      <p className="text-center text-sm text-white/55">Already registered? <Link href="/login" className="text-brand underline underline-offset-4">Log in</Link></p>
    </form>
  );
}
