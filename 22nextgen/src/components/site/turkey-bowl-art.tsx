import { cn } from "@/lib/utils";

/** Designed event mark used until official Turkey Bowl artwork is uploaded. */
export function TurkeyBowlArt({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("hero-glow relative isolate overflow-hidden", className)} role="img" aria-label="2026 Turkey Bowl Youth Combine and Clinic at Lombardi Field">
      <div className="yard-lines absolute inset-0 opacity-80" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-brand/25" aria-hidden />
      <div className="relative flex h-full min-h-0 flex-col justify-between p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-white/75">22 Next Gen</p>
          <p className="rounded-full border border-white/20 bg-black/50 px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-[0.16em]">Nov 28</p>
        </div>
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-[#7fb8ff]">Youth combine + clinic</p>
          <p className={cn("mt-1 font-display font-extrabold uppercase leading-[0.82] tracking-tight", compact ? "text-5xl" : "text-6xl sm:text-7xl")}>
            Turkey
            <br />
            Bowl
          </p>
          <p className="mt-3 text-sm text-white/80">Lombardi Field · Old Bridge, NJ</p>
          {!compact ? <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">22 Fitness × QB Life Academy</p> : null}
        </div>
      </div>
    </div>
  );
}
