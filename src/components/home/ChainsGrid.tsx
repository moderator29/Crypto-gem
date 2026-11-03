import Link from "next/link";
import { ChainBadge } from "@/components/ui/ChainBadge";
import type { ChainPulse } from "@/lib/market-data/pulse";
import { usdCompact } from "@/lib/utils/format";
import { Change } from "./TokenRow";

/** One card per active chain, with measured sample stats. Links to the chain page. */
export function ChainsGrid({ chains, limit = 8 }: { chains: ChainPulse[]; limit?: number }) {
  return (
    <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-4">
      {chains.slice(0, limit).map((c) => (
        <Link key={c.networkId} href={`/chains/${c.networkId}`} className="card hover-lift flex flex-col gap-3 p-4">
          <span className="flex items-center gap-2.5"><ChainBadge networkId={c.networkId} size={28} /><span className="truncate font-semibold tracking-tight">{c.name}</span></span>
          <span className="num flex items-baseline justify-between gap-2">
            <span className="text-lg font-bold">{usdCompact(c.volume24hUsd)}</span>
            <Change v={c.medianChange24h} />
          </span>
          <span className="text-xs text-muted">{c.pools} pools sampled · {c.newPools} new</span>
        </Link>
      ))}
    </div>
  );
}
