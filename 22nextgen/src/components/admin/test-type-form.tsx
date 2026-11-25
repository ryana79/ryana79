"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { testTypeSchema } from "@/lib/validation/admin";
import { saveTestType } from "@/lib/actions/admin/results";
import { Field } from "@/components/forms/field";
import { adminBtn } from "./ui";

type Input = { name: string; slug: string; unit: string; direction: string; min_value: string; max_value: string; decimals: string; protocol_note: string };

export function TestTypeForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useForm<Input>({ resolver: zodResolver(testTypeSchema) as never, defaultValues: { name: "", slug: "", unit: "s", direction: "lower_is_better", min_value: "0", max_value: "", decimals: "2", protocol_note: "" } });
  const { register, handleSubmit, setError, reset, formState: { errors } } = form;
  const err = (k: keyof Input) => (errors[k] as { message?: string } | undefined)?.message;
  const onSubmit = handleSubmit(() =>
    start(async () => {
      const res = await saveTestType(null, form.getValues());
      if (!res.ok) {
        Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => setError(k as keyof Input, { message: m[0] }));
        return void toast.error(res.error);
      }
      toast.success("Test added");
      reset();
      router.refresh();
    }),
  );
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 md:grid-cols-4">
      <Field label="Name" htmlFor="t-name" error={err("name")} required><input id="t-name" className="field" {...register("name")} /></Field>
      <Field label="Key" htmlFor="t-slug" error={err("slug")} hint="lowercase_with_underscores" required><input id="t-slug" className="field" {...register("slug")} /></Field>
      <Field label="Unit" htmlFor="t-unit" error={err("unit")} required><input id="t-unit" className="field" {...register("unit")} /></Field>
      <Field label="Better is" htmlFor="t-dir"><select id="t-dir" className="field" {...register("direction")}><option value="lower_is_better">Lower (times)</option><option value="higher_is_better">Higher (distances)</option></select></Field>
      <Field label="Min plausible" htmlFor="t-min" error={err("min_value")}><input id="t-min" inputMode="decimal" className="field" {...register("min_value")} /></Field>
      <Field label="Max plausible" htmlFor="t-max" error={err("max_value")}><input id="t-max" inputMode="decimal" className="field" {...register("max_value")} /></Field>
      <Field label="Decimals" htmlFor="t-dec" error={err("decimals")}><input id="t-dec" inputMode="numeric" className="field" {...register("decimals")} /></Field>
      <Field label="Protocol note" htmlFor="t-note"><input id="t-note" className="field" {...register("protocol_note")} /></Field>
      <div className="md:col-span-4"><button type="submit" disabled={pending} className={adminBtn.primary}>Add test</button></div>
    </form>
  );
}
