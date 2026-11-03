import Link from "next/link";
import { ChainBadge } from "@/components/ui/ChainBadge";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { getNetwork } from "@/lib/market-data/networks";
import type { PoolSummary } from "@/lib/market-data/types";
import { ageShort, priceUsd, usdCompact } from "@/lib/utils/format";
import { Change } from "./TokenRow";

/** Compact list for half-width sections. Each row is a real link to the token page. */
export function MiniList({ pools, note }: { pools: Array<{ pool: PoolSummary; note?: string }>; note?: (p: PoolSummary) => string }) {
  return (
    <ul className="card divide-y divide-[var(--line-1)] overflow-hidden">
      {pools.map(({ pool: p, note: n }) => (
        <li key={p.id}>
          <Link href={`/token/${p.networkId}/${p.baseToken.address}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-[var(--surface-2)]">
            <TokenLogo src={p.baseToken.imageUrl} symbol={p.baseToken.symbol} size={38} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2"><span className="truncate font-semibold">{p.baseToken.name || p.baseToken.symbol}</span><ChainBadge networkId={p.networkId} size={16} /></span>
              <span className="block truncate text-xs text-muted">{p.baseToken.symbol} · {n ?? note?.(p) ?? `${getNetwork(p.networkId)?.name ?? p.networkId} · ${usdCompact(p.liquidityUsd)} liquidity · ${ageShort(p.createdAt)}`}</span>
            </span>
            <span className="num text-right"><span className="block text-sm font-semibold">{priceUsd(p.priceUsd)}</span><span className="block text-xs"><Change v={p.change.h24} /></span></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
