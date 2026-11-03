"use client";

import Link from "next/link";
import type { RankedPool } from "@/lib/market-data/home";
import { getNetwork } from "@/lib/market-data/networks";
import { pct, priceUsd } from "@/lib/utils/format";
import { TokenLogo } from "@/components/ui/TokenLogo";

export function Ticker({ items }: { items: RankedPool[] }) {
  if (items.length < 3) return null;
  const row = items.slice(0, 15);
  const loop = [...row, ...row];
  return (
    <div className="glass-flat relative overflow-hidden" aria-label="Trending ticker" role="region">
      <div className="marquee py-2.5" style={{ ["--marquee-dur" as string]: `${row.length * 5}s` }}>
        {loop.map((p, i) => {
          const c = p.change.h24;
          return (
            <Link key={`${p.id}-${i}`} href={`/token/${p.networkId}/${p.baseToken.address}`} aria-hidden={i >= row.length ? true : undefined} tabIndex={i >= row.length ? -1 : 0} className="mx-1 flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-sm hover:bg-[var(--border)]">
              <span className="num text-xs font-bold text-muted">#{(i % row.length) + 1}</span>
              <TokenLogo src={p.baseToken.imageUrl} symbol={p.baseToken.symbol} size={20} />
              <span className="font-semibold">{p.baseToken.symbol}</span>
              <span className="num text-soft">{priceUsd(p.priceUsd)}</span>
              <span className={`num font-semibold ${c === null ? "text-muted" : c >= 0 ? "text-up" : "text-down"}`}>{pct(c)}</span>
              <span className="text-[10px] uppercase text-muted">{getNetwork(p.networkId)?.name ?? p.networkId}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
