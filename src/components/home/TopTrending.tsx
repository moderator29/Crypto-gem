"use client";

import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { TokenLogo } from "@/components/ui/TokenLogo";
import type { RankedPool } from "@/lib/market-data/home";
import { getNetwork } from "@/lib/market-data/networks";
import { ageShort, usdCompact } from "@/lib/utils/format";
import { Change } from "./TokenRow";

/** Snap-scrolling carousel of the top organic tokens. Rank is the organic score order. */
export function TopTrending({ items }: { items: RankedPool[] }) {
  const ref = useRef<HTMLDivElement>(null);
  if (items.length === 0) return null;
  const by = (dir: number) => ref.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  return (
    <section aria-label="Top trending" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Flame size={20} className="text-warm" /> Top Trending
        </h2>
        <div className="flex gap-2">
          <button type="button" className="btn !min-h-10 !px-0 w-10" aria-label="Scroll left" onClick={() => by(-1)}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="btn !min-h-10 !px-0 w-10" aria-label="Scroll right" onClick={() => by(1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div ref={ref} className="scroll-x pb-1">
        {items.slice(0, 12).map((p, i) => (
          <Link key={p.id} href={`/token/${p.networkId}/${p.baseToken.address}`} className="glass hover-lift w-[172px] shrink-0 snap-start space-y-2 !rounded-2xl p-2.5">
            <div className="aspect-square w-full overflow-hidden rounded-xl bg-[var(--border)]">
              <TokenLogo src={p.baseToken.imageUrl} symbol={p.baseToken.symbol} size={172} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold">{p.baseToken.name || p.baseToken.symbol}</span>
              <span className="num shrink-0 text-xs font-bold text-warm">#{i + 1}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="truncate">${p.baseToken.symbol}</span>
              <Change v={p.change.h24} />
            </div>
            <div className="num text-sm font-bold">
              {usdCompact(p.marketCapUsd ?? p.fdvUsd)} <span className="text-[10px] font-medium text-muted">{p.marketCapUsd ? "MC" : "FDV"}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span className="truncate">{getNetwork(p.networkId)?.name ?? p.networkId}</span>
              <span className="num">{ageShort(p.createdAt)}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
