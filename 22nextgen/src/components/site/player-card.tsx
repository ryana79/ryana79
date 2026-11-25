import { MediaImage } from "./media";
import { athleteName, formatHeight, formatMeasurement, formatWeight } from "@/lib/format";
import type { AthleteRow } from "@/lib/types";
import { BadgeCheck } from "lucide-react";

type Metric = { slug: string; name: string; unit: string; decimals: number; value: number };

/** Branded 22 NEXT GEN player card. Only approved public fields; image download is a planned NEXT GEN+ feature. */
export function PlayerCard({ athlete, metrics }: { athlete: AthleteRow; metrics: Metric[] }) {
  const name = athleteName(athlete);
  const hw = [formatHeight(athlete.height_in), formatWeight(athlete.weight_lb)].filter(Boolean).join(" · ");
  return (
    <div id="player-card" className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br from-[#147dff] via-[#0b3f85] to-[#0a0f1a] p-[2px] shadow-[0_30px_80px_-30px_rgba(20,125,255,0.7)]">
      <div className="relative overflow-hidden rounded-[calc(1rem-2px)] bg-[#0a0d14]">
        <div className="yard-lines absolute inset-0 opacity-70" aria-hidden />
        <div className="relative flex items-center justify-between px-5 pt-4 font-display text-sm font-bold uppercase tracking-[0.25em]">
          <span><span className="text-brand">22</span> NEXT GEN</span>
          <span className="text-white/60">{athlete.graduation_year ? `CLASS OF ${athlete.graduation_year}` : "ATHLETE"}</span>
        </div>
        <div className="relative mx-5 mt-3 aspect-[4/4.4] overflow-hidden rounded-xl">
          <MediaImage path={athlete.profile_image_path} alt={name} sizes="384px" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d14] via-transparent to-transparent" aria-hidden />
          {athlete.primary_position ? (
            <div className="absolute right-3 top-3 rounded-md bg-brand px-3 py-1 font-display text-xl font-extrabold">{athlete.primary_position}</div>
          ) : null}
        </div>
        <div className="relative px-5 pb-5 pt-3">
          <h2 className="font-display text-4xl font-extrabold uppercase leading-none">{name}</h2>
          <p className="mt-1 text-sm text-white/60">{[athlete.team, athlete.region].filter(Boolean).join(" · ")}</p>
          {hw ? <p className="mt-1 text-sm text-white/60">{hw}</p> : null}
          {metrics.length ? (
            <dl className="mt-4 grid grid-cols-2 gap-2">
              {metrics.slice(0, 4).map((m) => (
                <div key={m.slug} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                  <dt className="text-[10px] uppercase tracking-wider text-white/45">{m.name}</dt>
                  <dd className="font-display text-xl font-bold">{formatMeasurement(m.value, m.unit, m.decimals)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-white/15 px-3 py-3 text-xs text-white/45">No verified combine results yet.</p>
          )}
          {metrics.length ? (
            <p className="mt-3 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-emerald-300/80"><BadgeCheck className="size-3.5" /> Verified results only</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
