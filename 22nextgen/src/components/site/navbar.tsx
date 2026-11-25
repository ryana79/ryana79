"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-300", scrolled || mobileOpen ? "border-b border-white/[0.08] bg-[#080808]/90 backdrop-blur-xl" : "bg-gradient-to-b from-black/70 to-transparent")}>
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

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 bottom-0 overflow-y-auto bg-[#080808] px-5 pb-10 pt-4 lg:hidden"
          >
            <ul className="divide-y divide-white/[0.07]">
              {NAV.flatMap((item) => (item.children ? item.children : [{ label: item.label, href: item.href }])).map((c) => (
                <li key={c.href}>
                  <Link href={c.href} className={cn("flex items-center justify-between py-4 font-display text-3xl font-bold uppercase tracking-wide", isActive(c.href) ? "text-brand" : "text-white")}>
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 grid gap-3">
              <ButtonLink href="/register" size="lg">Create Athlete Profile</ButtonLink>
              <ButtonLink href={signedIn ? "/dashboard" : "/login"} variant="outline" size="lg">
                {signedIn ? "Dashboard" : "Log In"}
              </ButtonLink>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
