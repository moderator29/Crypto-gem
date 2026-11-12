import { liquidityByDex, dexLabel } from "@/lib/market-data/analytics";
import type { PoolSummary } from "@/lib/market-data/types";
import { usdCompact } from "@/lib/utils/format";

const TONES = ["var(--brand)", "#5cc8ff", "#ffd24a", "#a78bfa", "#34d399"] as const;
const R = 42;
const C = 2 * Math.PI * R;

/** Liquidity by DEX across the sampled pools, as a donut with a legend. Draws nothing when the pools carry no DEX or liquidity data. */
export function DexDonut({ pools, title = "Liquidity by DEX" }: { pools: PoolSummary[]; title?: string }) {
  const slices = liquidityByDex(pools, 5);
  const total = slices.reduce((s, r) => s + r.value, 0);
  const starts = slices.map((_, i) => slices.slice(0, i).reduce((t, r) => t + r.share, 0));
  return (
    <div className="card p-4 md:p-5">
      <h3 className="h3">{title}</h3>
      <p className="text-xs text-muted">Share of liquidity in the pools we sample on this chain</p>
      {slices.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">The sampled pools carry no DEX or liquidity data.</p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <svg viewBox="0 0 100 100" width="132" height="132" role="img" aria-label={`Liquidity by DEX: ${slices.map((s) => `${dexLabel(s.dex)} ${(s.share * 100).toFixed(0)} percent`).join(", ")}`} className="shrink-0 -rotate-90">
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="12" />
            {slices.map((s, i) => {
              const len = Math.max(0.5, s.share * C - 1.5);
              const off = -(starts[i] ?? 0) * C;
              return <circle key={s.dex} cx="50" cy="50" r={R} fill="none" stroke={s.dex === "other" ? "var(--text-muted)" : TONES[i % TONES.length]} strokeWidth="12" strokeDasharray={`${len} ${C}`} strokeDashoffset={off} className="mk-arc" style={{ ["--len" as string]: len, ["--c" as string]: C, animationDelay: `${i * 90}ms` }} />;
            })}
          </svg>
          <div className="min-w-[160px] flex-1">
            <p className="num text-2xl font-bold">{usdCompact(total)}</p>
            <ul className="mt-2 space-y-1.5">
              {slices.map((s, i) => (
                <li key={s.dex} className="flex items-center gap-2 text-sm">
                  <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.dex === "other" ? "var(--text-muted)" : TONES[i % TONES.length] }} />
                  <span className="min-w-0 flex-1 truncate">{dexLabel(s.dex)}</span>
                  <span className="num font-semibold">{(s.share * 100).toFixed(s.share < 0.1 ? 1 : 0)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
