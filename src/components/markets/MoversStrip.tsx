import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { TokenLogo } from "@/components/ui/TokenLogo";
import type { PoolSummary } from "@/lib/market-data/types";
import { pct, usdCompact } from "@/lib/utils/format";

function Card({ p }: { p: PoolSummary }) {
  const c = p.change.h24 ?? 0;
  const up = c >= 0;
  return (
    <Link href={`/token/${p.networkId}/${p.baseToken.address}`} className="mk-mover card card-flat hover-lift">
      <span className="flex items-center gap-2">
        <TokenLogo src={p.baseToken.imageUrl} symbol={p.baseToken.symbol} size={28} networkId={p.networkId} address={p.baseToken.address} />
        <span className="min-w-0 flex-1 truncate text-sm font-bold uppercase">{p.baseToken.symbol}</span>
        {up ? <ArrowUpRight size={15} className="text-up" aria-hidden="true" /> : <ArrowDownRight size={15} className="text-down" aria-hidden="true" />}
      </span>
      <span className={`num text-lg font-bold ${up ? "text-up" : "text-down"}`}>{pct(c, 1)}</span>
      <span className="num text-[11px] text-muted">liq {usdCompact(p.liquidityUsd)}</span>
    </Link>
  );
}

/** Horizontally scrolling strip of the biggest 24h risers then fallers. Shows nothing when no liquid pool moved. */
export function MoversStrip({ up, down, name }: { up: PoolSummary[]; down: PoolSummary[]; name: string }) {
  if (up.length === 0 && down.length === 0) return null;
  return (
    <section aria-label={`Top movers on ${name}`} className="space-y-3">
      <h2 className="h3">Top movers on {name}</h2>
      <ul className="scroll-x mk-strip">
        {[...up, ...down].map((p) => <li key={p.id} className="shrink-0"><Card p={p} /></li>)}
      </ul>
      <p className="text-[11px] text-muted">24h change among pools with at least $5K liquidity in the sample. Risers first, then fallers.</p>
    </section>
  );
}
