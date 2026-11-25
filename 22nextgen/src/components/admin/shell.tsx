"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/site/logo";
import { ADMIN_NAV } from "./nav";
import { can, type AppRole } from "@/lib/permissions";
import { signOut } from "@/lib/actions/auth";

export function AdminShell({ email, roles, children }: { email: string | null; roles: AppRole[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }
  const items = ADMIN_NAV.filter((i) => can(roles, i.capability));
  const groups = [...new Set(items.map((i) => i.group))];
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5"><Wordmark className="text-2xl" /><span className="rounded bg-brand/20 px-1.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest text-brand">Admin</span></div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 pb-6 pt-2">
        {groups.map((g) => (
          <div key={g}>
            <p className="mb-1.5 px-3 font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">{g}</p>
            <ul className="space-y-0.5">
              {items.filter((i) => i.group === g).map((i) => (
                <li key={i.href}>
                  <Link href={i.href} aria-current={active(i.href) ? "page" : undefined} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm transition", active(i.href) ? "bg-brand/15 font-medium text-white" : "text-white/65 hover:bg-white/[0.05] hover:text-white")}>
                    <i.icon className={cn("size-4", active(i.href) ? "text-brand" : "text-white/40")} />{i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/[0.08] p-3">
        <p className="truncate px-2 text-xs text-white/60" title={email ?? undefined}>{email}</p>
        <p className="mb-2 px-2 text-[11px] uppercase tracking-wider text-brand">{roles.filter((r) => r !== "parent").join(" · ")}</p>
        <div className="flex gap-2">
          <Link href="/" target="_blank" className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-white/10 py-1.5 text-xs text-white/70 hover:bg-white/5"><ExternalLink className="size-3.5" />View site</Link>
          <form action={signOut} className="flex-1"><button type="submit" className="flex w-full items-center justify-center gap-1.5 rounded-md border border-white/10 py-1.5 text-xs text-white/70 hover:bg-white/5"><LogOut className="size-3.5" />Sign out</button></form>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh bg-[#0a0a0b] text-white lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r border-white/[0.08] bg-sidebar lg:block">{sidebar}</aside>
      <div className="min-w-0">
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.08] bg-[#0a0a0b]/90 px-4 backdrop-blur lg:hidden">
          <Wordmark className="text-xl" />
          <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)} className="inline-flex size-10 items-center justify-center rounded-md hover:bg-white/10">{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </div>
        {open ? <div className="fixed inset-0 top-14 z-40 overflow-y-auto bg-sidebar lg:hidden">{sidebar}</div> : null}
        <main id="admin-main" className="mx-auto w-full max-w-[88rem] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
