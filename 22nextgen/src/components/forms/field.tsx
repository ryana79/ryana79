import { cn } from "@/lib/utils";

export function Field({ label, error, hint, children, className, htmlFor, required }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string; htmlFor?: string; required?: boolean }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-white/85">
        {label}{required ? <span className="text-brand"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-white/45">{hint}</p> : null}
      {error ? <p role="alert" className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
