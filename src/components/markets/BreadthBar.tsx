import { changeHistogram, marketBreadth } from "@/lib/market-data/analytics";
import type { PoolSummary } from "@/lib/market-data/types";

/** Share of pools up, flat and down over 24h, with a histogram of how far they moved. Counts only pools that report a change. */
export function BreadthBar({ pools }: { pools: PoolSummary[] }) {
  const b = marketBreadth(pools, "h24");
  if (b.total === 0) return null;
  const bins = changeHistogram(pools, "h24");
  const peak = Math.max(1, ...bins.map((x) => x.count));
  const pctOf = (n: number) => (n / b.total) * 100;
  return (
    <section className="card space-y-3 p-4" aria-label="Market breadth">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="h3">Market breadth</h2>
        <p className="num text-xs text-muted">{b.up} up, {b.flat} flat, {b.down} down over 24h</p>
      </div>
      <div className="mk-breadth" role="img" aria-label={`${pctOf(b.up).toFixed(0)} percent of pools up, ${pctOf(b.flat).toFixed(0)} percent flat, ${pctOf(b.down).toFixed(0)} percent down`}>
        <span style={{ width: `${pctOf(b.up)}%`, background: "var(--up)" }} />
        <span style={{ width: `${pctOf(b.flat)}%`, background: "var(--text-muted)", opacity: 0.55 }} />
        <span style={{ width: `${pctOf(b.down)}%`, background: "var(--down)" }} />
      </div>
      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] items-end gap-1.5" aria-label="Distribution of 24h change">
        {bins.map((x) => (
          <div key={x.label} className="flex flex-col items-center gap-1" title={`${x.count} pools, ${x.label}`}>
            <span className="num text-[10px] font-semibold text-soft">{x.count}</span>
            <span className="mk-hbar" style={{ height: `${Math.max(3, (x.count / peak) * 44)}px`, background: x.tone === "up" ? "var(--up)" : x.tone === "down" ? "var(--down)" : "var(--text-muted)" }} />
            <span className="num w-full truncate text-center text-[9.5px] text-muted">{x.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
