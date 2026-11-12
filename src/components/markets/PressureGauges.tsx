import Link from "next/link";
import { ChainBadge } from "@/components/ui/ChainBadge";
import { buyShare } from "@/lib/market-data/analytics";
import type { ChainPulse } from "@/lib/market-data/pulse";

/** Buy versus sell pressure per chain from 24h trade counts in liquid pools. Chains with no trade data are listed as unmeasured. */
export function PressureGauges({ chains }: { chains: ChainPulse[] }) {
  const rows = chains
    .map((c) => ({ c, buy: buyShare(c.buySellRatio) }))
    .filter((r): r is { c: ChainPulse; buy: number } => r.buy !== null)
    .sort((a, b) => b.buy - a.buy)
    .slice(0, 12);
  if (rows.length === 0) return <p className="card p-5 text-sm text-soft">No chain has enough liquid pools with trade counts to measure buy and sell pressure right now.</p>;
  return (
    <div className="stagger grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-2">
      {rows.map(({ c, buy }) => (
        <Link key={c.networkId} href={`/chains/${c.networkId}`} className="card card-flat hover-lift block space-y-2 p-3.5" aria-label={`${c.name}: ${buy.toFixed(0)} percent buys, ${(100 - buy).toFixed(0)} percent sells`}>
          <span className="flex items-center gap-2">
            <ChainBadge networkId={c.networkId} size={20} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.name}</span>
            <span className={`num text-xs font-bold ${buy >= 50 ? "text-up" : "text-down"}`}>{buy >= 50 ? "Buyers lead" : "Sellers lead"}</span>
          </span>
          <span className="mk-gauge" aria-hidden="true">
            <span className="mk-gauge-buy" style={{ width: `${buy}%` }} />
            <span className="mk-gauge-sell" style={{ width: `${100 - buy}%` }} />
            <i className="mk-gauge-mid" />
          </span>
          <span className="num flex justify-between text-[11px] font-semibold">
            <span className="text-up">{buy.toFixed(0)}% buys</span>
            <span className="text-muted">{c.buySellRatio?.toFixed(2)} buys per sell</span>
            <span className="text-down">{(100 - buy).toFixed(0)}% sells</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
