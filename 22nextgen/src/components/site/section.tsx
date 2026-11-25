import { cn } from "@/lib/utils";
import { ButtonLink } from "./btn";
import { ArrowRight } from "lucide-react";

export function Section({ children, className, tone = "base", id }: { children: React.ReactNode; className?: string; tone?: "base" | "surface" | "surface2"; id?: string }) {
  const bg = tone === "surface" ? "bg-surface" : tone === "surface2" ? "bg-surface-2" : "bg-background";
  return (
    <section id={id} className={cn("relative py-16 sm:py-20 lg:py-24", bg, className)}>
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">{children}</div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  hrefLabel = "View all",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string | null;
  href?: string;
  hrefLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-10 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
        <h2 className="display-xl text-4xl sm:text-5xl lg:text-6xl">{title}</h2>
        {description ? <p className="mt-4 text-base text-white/60 sm:text-lg">{description}</p> : null}
      </div>
      {href ? (
        <ButtonLink href={href} variant="ghost" size="sm" className="self-start sm:self-auto">
          {hrefLabel} <ArrowRight className="size-4" />
        </ButtonLink>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center", className)}>
      <div className="yard-lines pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-md">
        {icon ? <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-brand/15 text-brand">{icon}</div> : null}
        <h3 className="font-display text-2xl font-bold uppercase tracking-wide">{title}</h3>
        {description ? <p className="mt-2 text-sm text-white/60">{description}</p> : null}
        {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

export function PageHero({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: React.ReactNode }) {
  return (
    <header className="hero-glow relative overflow-hidden border-b border-white/[0.06] pt-32 pb-14 sm:pt-40 sm:pb-20">
      <div className="yard-lines absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
        <h1 className="display-xl max-w-4xl text-5xl sm:text-7xl lg:text-8xl">{title}</h1>
        {description ? <p className="mt-5 max-w-2xl text-lg text-white/65">{description}</p> : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </header>
  );
}
