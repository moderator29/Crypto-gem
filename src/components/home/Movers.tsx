import { TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { TokenLogo } from "@/components/ui/TokenLogo";
import type { PoolSummary } from "@/lib/market-data/types";
import { priceUsd } from "@/lib/utils/format";
import { Change } from "./TokenRow";

function Column({ title, icon, pools }: { title: string; icon: React.ReactNode; pools: PoolSummary[] }) {
  return (
    <div className="card overflow-hidden">
      <h2 className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-semibold">{icon}{title}</h2>
      <ul className="divide-y divide-[var(--line-1)]">
        {pools.map((p, i) => (
          <li key={p.id}>
            <Link href={`/token/${p.networkId}/${p.baseToken.address}`} className="row-in flex items-center gap-3 px-4 py-2.5 transition hover:bg-[var(--surface-2)]" style={{ ["--i" as string]: i }}>
              <TokenLogo src={p.baseToken.imageUrl} symbol={p.baseToken.symbol} size={30} networkId={p.networkId} address={p.baseToken.address} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.baseToken.symbol}</span>
              <span className="num text-xs text-muted">{priceUsd(p.priceUsd)}</span>
              <span className="num w-20 text-right text-sm"><Change v={p.change.h24} /></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Five biggest 24h gainers and losers among liquid pools in the sampled set. Not a ranking of the whole market. */
export function Movers({ gainers, losers }: { gainers: PoolSummary[]; losers: PoolSummary[] }) {
  if (gainers.length === 0 && losers.length === 0) return null;
  return (
    <section aria-label="Top movers" className="reveal grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
      <Column title="Top gainers" icon={<TrendingUp size={16} className="text-up" aria-hidden="true" />} pools={gainers.slice(0, 5)} />
      <Column title="Top losers" icon={<TrendingDown size={16} className="text-down" aria-hidden="true" />} pools={losers.slice(0, 5)} />
    </section>
  );
}
