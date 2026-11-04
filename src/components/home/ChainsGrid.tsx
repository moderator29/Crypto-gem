import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Spotlight } from "@/components/fx/Spotlight";
import { ChainBadge } from "@/components/ui/ChainBadge";
import type { ChainPulse } from "@/lib/market-data/pulse";
import { usdCompact } from "@/lib/utils/format";
import { Change } from "./TokenRow";

/** Brand-adjacent accent per chain, used only as a soft glow behind the tile. */
const GLOW: Record<string, string> = { ethereum: "#627eea", solana: "#14f195", bsc: "#f3ba2f", base: "#0052ff", arbitrum: "#28a0f0", optimism: "#ff0420", polygon: "#8247e5", avalanche: "#e84142", ton: "#0098ea", tron: "#ff3b30", sui: "#4da2ff", robinhood: "#9cf200" };

/** One tile per active chain with measured sample stats and its share of sampled volume. Links to the chain page. */
export function ChainsGrid({ chains, limit = 8 }: { chains: ChainPulse[]; limit?: number }) {
  const shown = chains.slice(0, limit);
  const total = chains.reduce((s, c) => s + c.volume24hUsd, 0) || 1;
  return (
    <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-4">
      {shown.map((c) => {
        const share = (c.volume24hUsd / total) * 100;
        const glow = GLOW[c.networkId] ?? "var(--brand)";
        return (
          <Spotlight key={c.networkId} className="rounded-[var(--r-lg)]">
            <Link href={`/chains/${c.networkId}`} className="card hover-lift group relative flex h-full flex-col gap-3 overflow-hidden p-4">
              <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-25 blur-2xl transition-opacity duration-500 group-hover:opacity-50" style={{ background: glow }} />
              <span className="relative flex items-center gap-2.5">
                <ChainBadge networkId={c.networkId} size={30} />
                <span className="min-w-0 flex-1 truncate font-semibold tracking-tight">{c.name}</span>
                <ArrowUpRight size={15} className="text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-text" aria-hidden="true" />
              </span>
              <span className="num relative flex items-baseline justify-between gap-2">
                <span className="text-xl font-bold">{usdCompact(c.volume24hUsd)}</span>
                <Change v={c.medianChange24h} />
              </span>
              <span className="relative space-y-1.5">
                <span className="block h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]"><span className="fx-fill block h-full rounded-full" style={{ width: `${Math.max(3, share)}%`, background: glow }} /></span>
                <span className="flex justify-between text-[11px] text-muted"><span>{c.pools} pools · {c.newPools} new</span><span className="num">{share.toFixed(0)}% of volume</span></span>
              </span>
            </Link>
          </Spotlight>
        );
      })}
    </div>
  );
}
