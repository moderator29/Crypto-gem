import Link from "next/link";
import type { ReactNode } from "react";
import { Panel } from "@/components/ui/Panel";
import { ChainBadge } from "@/components/ui/ChainBadge";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { getNetwork } from "@/lib/market-data/networks";
import type { PoolSummary } from "@/lib/market-data/types";
import { ageShort, priceUsd, usdCompact } from "@/lib/utils/format";
import { Change } from "./TokenRow";

/** Compact list for half-width sections. Each row is a real link to the token page. */
export function MiniList({ title, icon, href, pools, note }: { title: string; icon?: ReactNode; href?: string; pools: Array<{ pool: PoolSummary; note?: string }>; note?: (p: PoolSummary) => string }) {
  return (
    <Panel title={title} icon={icon} href={href}>
    <ul className="rows">
      {pools.map(({ pool: p, note: n }) => (
        <li key={p.id}>
          <Link href={`/token/${p.networkId}/${p.baseToken.address}`} className="flex items-center gap-3 px-4 py-3 transition">
            <TokenLogo src={p.baseToken.imageUrl} symbol={p.baseToken.symbol} size={38} networkId={p.networkId} address={p.baseToken.address} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2"><span className="truncate font-semibold">{p.baseToken.name || p.baseToken.symbol}</span><ChainBadge networkId={p.networkId} size={16} /></span>
              <span className="block truncate text-xs text-muted">{p.baseToken.symbol} · {n ?? note?.(p) ?? [getNetwork(p.networkId)?.name ?? p.networkId, p.liquidityUsd ? `${usdCompact(p.liquidityUsd)} liq` : null, p.createdAt ? ageShort(p.createdAt) : null].filter(Boolean).join(" · ")}</span>
            </span>
            <span className="num text-right"><span className="block text-sm font-semibold">{priceUsd(p.priceUsd)}</span><span className="block text-xs"><Change v={p.change.h24} /></span></span>
          </Link>
        </li>
      ))}
    </ul>
    </Panel>
  );
}
