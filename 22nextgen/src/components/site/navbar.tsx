"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { NAV } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Wordmark } from "./logo";
import { ButtonLink } from "./btn";

export function Navbar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
    setOpenMenu(null);
  }

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50", mobileOpen ? "border-b border-white/10 bg-[#080808]" : scrolled ? "border-b border-white/[0.08] bg-[#080808]/90 backdrop-blur-xl" : "bg-gradient-to-b from-black/70 to-transparent")}>
      <nav ref={navRef} aria-label="Primary" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:h-[4.5rem]">
        <Wordmark />

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <li key={item.label} className="relative" onMouseLeave={() => item.children && setOpenMenu(null)}>
              {item.children ? (
                <>
                  <button
                    type="button"
                    aria-expanded={openMenu === item.label}
                    aria-haspopup="menu"
                    onMouseEnter={() => setOpenMenu(item.label)}
                    onClick={() => setOpenMenu(openMenu === item.label ? null : item.label)}
                    className={cn("flex items-center gap-1 rounded-md px-3.5 py-2 font-display text-[1.05rem] font-semibold uppercase tracking-[0.12em] transition-colors hover:text-white", isActive(item.href) ? "text-white" : "text-white/70")}
                  >
                    {item.label}
                    <ChevronDown className={cn("size-4 transition-transform", openMenu === item.label && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {openMenu === item.label ? (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.16 }}
                        role="menu"
                        className="absolute left-0 top-full w-72 pt-2"
                      >
                        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111827] p-2 shadow-2xl">
                          {item.children.map((c) => (
                            <Link key={c.href} href={c.href} role="menuitem" className="block rounded-lg px-3 py-3 transition hover:bg-white/[0.06]">
                              <span className="block font-display text-lg font-bold uppercase tracking-wide">{c.label}</span>
                              {c.description ? <span className="block text-xs text-white/50">{c.description}</span> : null}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </>
              ) : (
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn("relative rounded-md px-3.5 py-2 font-display text-[1.05rem] font-semibold uppercase tracking-[0.12em] transition-colors hover:text-white", isActive(item.href) ? "text-white" : "text-white/70")}
                >
                  {item.label}
                  {isActive(item.href) ? <span className="absolute inset-x-3.5 -bottom-0.5 h-0.5 bg-brand" /> : null}
                </Link>
              )}
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          <ButtonLink href={signedIn ? "/dashboard" : "/login"} variant="ghost" size="sm">
            {signedIn ? "Dashboard" : "Log In"}
          </ButtonLink>
          <ButtonLink href="/register" size="sm">
            Create Profile
          </ButtonLink>
        </div>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-md text-white hover:bg-white/10 lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>

      {mobileOpen ? <MobileMenu signedIn={signedIn} isActive={isActive} /> : null}
    </header>
  );
}

function MobileMenu({ signedIn, isActive }: { signedIn: boolean; isActive: (href: string) => boolean }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col bg-[#080808] lg:hidden">
      <nav className="min-h-0 flex-1 overflow-y-auto px-5 pt-2" aria-label="Mobile">
        <ul>
          {NAV.map((item) =>
            item.children ? (
              <li key={item.label} className="border-b border-white/10 py-2">
                <p className="px-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{item.label}</p>
                <ul className="mt-1">
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        aria-current={isActive(child.href) ? "page" : undefined}
                        className={cn("flex min-h-11 items-center rounded-lg px-2 font-display text-xl font-bold uppercase tracking-wide", isActive(child.href) ? "text-brand" : "text-white")}
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ) : (
              <li key={item.href} className="border-b border-white/10">
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn("flex min-h-14 items-center font-display text-2xl font-bold uppercase tracking-wide", isActive(item.href) ? "text-brand" : "text-white")}
                >
                  {item.label}
                </Link>
              </li>
            ),
          )}
        </ul>
      </nav>
      <div className="grid gap-2 border-t border-white/10 bg-[#080808] px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <ButtonLink href="/register" size="md" className="w-full">Create Athlete Profile</ButtonLink>
        <ButtonLink href={signedIn ? "/dashboard" : "/login"} variant="outline" size="md" className="w-full">
          {signedIn ? "Dashboard" : "Log In"}
        </ButtonLink>
      </div>
    </div>,
    document.body,
  );
}
