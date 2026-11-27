import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { ReactNode } from "react";

export function AdminPageHeader({ title, description, actions, backHref }: { title: string; description?: string; actions?: ReactNode; backHref?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {backHref ? <Link href={backHref} className="mb-2 inline-flex items-center gap-1 text-xs text-white/50 hover:text-white"><ChevronLeft className="size-3.5" />Back</Link> : null}
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-wide">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-white/55">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ title, description, children, className, actions }: { title?: string; description?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-white/[0.08] bg-[#111113]", className)}>
      {title ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
          <div><h2 className="font-display text-xl font-bold uppercase tracking-wide">{title}</h2>{description ? <p className="mt-0.5 text-xs text-white/50">{description}</p> : null}</div>
          {actions}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, href }: { label: string; value: string | number; hint?: string; href?: string }) {
  const body = (
    <div className="h-full rounded-xl border border-white/[0.08] bg-[#111113] p-4 transition hover:border-brand/40">
      <p className="text-xs uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-1 font-display text-4xl font-extrabold">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-white/40">{hint}</p> : null}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

const TONES = {
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  blue: "border-brand/30 bg-brand/10 text-[#7fb8ff]",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  red: "border-red-500/30 bg-red-500/10 text-red-300",
  gray: "border-white/10 bg-white/[0.05] text-white/60",
} as const;

export function StatusBadge({ status }: { status: string }) {
  const tone: keyof typeof TONES =
    ["published", "approved", "verified", "granted", "open", "applied", "completed", "linked", "active", "opted_in"].includes(status) ? "green"
    : ["draft", "pending_review", "unverified", "pending", "needs_review", "staged", "previewed", "received", "new", "verifying", "in_progress", "none", "inactive", "coming_soon", "unknown"].includes(status) ? "amber"
    : ["rejected", "failed", "withdrawn", "declined", "cancelled", "past_due", "opted_out"].includes(status) ? "red"
    : "gray";
  return <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider", TONES[tone])}>{status.replace(/_/g, " ")}</span>;
}

export function Notice({ tone = "blue", title, children }: { tone?: keyof typeof TONES; title?: string; children: ReactNode }) {
  return (
    <div role="note" className={cn("rounded-lg border p-3.5 text-sm", TONES[tone])}>
      {title ? <p className="mb-0.5 font-semibold">{title}</p> : null}
      <div className="text-white/80">{children}</div>
    </div>
  );
}

export type Column<T> = { header: string; cell: (row: T) => ReactNode; className?: string };

export function DataTable<T extends { id: string | number }>({ columns, rows, empty, caption }: { columns: Column<T>[]; rows: T[]; empty: ReactNode; caption: string }) {
  if (!rows.length) return <div className="rounded-xl border border-dashed border-white/15 p-10 text-center text-sm text-white/55">{empty}</div>;
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111113]">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-white/[0.08] text-left text-[11px] uppercase tracking-wider text-white/40">
          <tr>{columns.map((c) => <th key={c.header} scope="col" className={cn("px-4 py-3 font-semibold", c.className)}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
              {columns.map((c) => <td key={c.header} className={cn("px-4 py-3 align-middle", c.className)}>{c.cell(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SearchBar({ action, q, placeholder = "Search", children }: { action: string; q?: string; placeholder?: string; children?: ReactNode }) {
  return (
    <form action={action} method="get" role="search" className="mb-4 flex flex-wrap items-center gap-2">
      <label className="relative min-w-56 flex-1">
        <span className="sr-only">{placeholder}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
        <input name="q" defaultValue={q ?? ""} placeholder={placeholder} className="field pl-9" />
      </label>
      {children}
      <button type="submit" className="h-10 rounded-md bg-white/10 px-4 text-sm font-medium hover:bg-white/15">Search</button>
    </form>
  );
}

export function Pagination({ page, pageSize, total, basePath, params }: { page: number; pageSize: number; total: number; basePath: string; params?: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const q = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([k, v]) => v && q.set(k, v));
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-white/55">
      <span>{total} total · page {page} of {pages}</span>
      <div className="flex gap-2">
        {page > 1 ? <Link href={href(page - 1)} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 hover:bg-white/5"><ChevronLeft className="size-4" />Prev</Link> : null}
        {page < pages ? <Link href={href(page + 1)} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 hover:bg-white/5">Next<ChevronRight className="size-4" /></Link> : null}
      </div>
    </div>
  );
}

export const adminBtn = {
  primary: "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white transition hover:bg-[#3a91ff] disabled:opacity-50",
  secondary: "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/15 px-4 text-sm font-medium text-white/85 transition hover:bg-white/5 disabled:opacity-50",
  danger: "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-4 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-50",
};

export function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 10000 ? n : 1;
}

/** Escape user text for use inside a PostgREST ilike/or filter. */
export function safeTerm(q: string | undefined): string {
  return (q ?? "").replace(/[%_,()*\\"]/g, " ").trim().slice(0, 60);
}
