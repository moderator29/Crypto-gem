import Link from "next/link";
import { ChainBadge } from "@/components/ui/ChainBadge";
import { TokenLogo } from "@/components/ui/TokenLogo";
import type { Surge } from "@/lib/market-data/analytics";
import { getNetwork } from "@/lib/market-data/networks";
import { pct, usdCompact } from "@/lib/utils/format";

/** Pools trading well above their own daily pace, each with a ratio chip showing how many times over. */
export function SurgeList({ surges }: { surges: Surge[] }) {
  if (surges.length === 0) return <p className="card p-5 text-sm text-soft">No liquid pool shows last-hour volume at twice its own 24h hourly pace right now.</p>;
  return (
    <ul className="stagger grid grid-cols-[minmax(0,1fr)] gap-2">
      {surges.map(({ pool: p, ratio }) => {
        const t = p.baseToken;
        const c = p.change.h1;
        return (
          <li key={p.id}>
            <Link href={`/token/${p.networkId}/${t.address}`} className="card card-flat hover-lift flex items-center gap-3 p-3">
              <TokenLogo src={t.imageUrl} symbol={t.symbol} size={38} networkId={p.networkId} address={t.address} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold leading-tight">{t.name || t.symbol}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted"><ChainBadge networkId={p.networkId} size={14} /><span className="truncate">{getNetwork(p.networkId)?.name ?? p.networkId}</span><span className="num">liq {usdCompact(p.liquidityUsd)}</span></span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="mk-ratio num" title="Last hour volume as a multiple of this pool's average hour over 24h">{ratio >= 10 ? ratio.toFixed(0) : ratio.toFixed(1)}x pace</span>
                <span className={`num text-xs font-semibold ${c === null ? "text-muted" : c >= 0 ? "text-up" : "text-down"}`}>{pct(c)} 1h</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
