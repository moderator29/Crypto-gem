"use client";

import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import { Tilt } from "@/components/fx/Tilt";
import { TokenLogo } from "@/components/ui/TokenLogo";
import type { RankedPool } from "@/lib/market-data/home";
import { getNetwork } from "@/lib/market-data/networks";
import { ageShort, usdCompact } from "@/lib/utils/format";
import { Change } from "./TokenRow";

/** Snap-scrolling carousel of the top organic tokens. Rank is the organic score order. */
export function TopTrending({ items }: { items: RankedPool[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useT();
  if (items.length === 0) return null;
  const by = (dir: number) => ref.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  return (
    <section aria-label="Top trending" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="h2 flex items-center gap-2">
          <Flame size={20} className="text-warm" aria-hidden="true" /> {t("home.topTrending")}
        </h2>
        <div className="flex items-center gap-3">
          <Link href="/markets" className="hidden text-sm font-semibold text-brand transition hover:text-text sm:inline">View all</Link>
          <button type="button" className="btn btn-icon btn-sm" aria-label="Scroll left" onClick={() => by(-1)}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="btn btn-icon btn-sm" aria-label="Scroll right" onClick={() => by(1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div ref={ref} className="scroll-x pb-1">
        {items.slice(0, 12).map((p, i) => (
          <Tilt key={p.id} className="shrink-0 snap-start">
          <Link href={`/token/${p.networkId}/${p.baseToken.address}`} className={`card hover-lift block w-[158px] overflow-hidden !rounded-2xl sm:w-[188px] ${i === 0 ? "fx-border" : ""}`} style={{ animationDelay: `${i * 40}ms` }}>
            <div className="relative grid h-[88px] place-items-center bg-[radial-gradient(circle_at_50%_30%,var(--aurora-a),transparent_75%)] sm:h-[104px]">
              <TokenLogo src={p.baseToken.imageUrl} symbol={p.baseToken.symbol} size={64} networkId={p.networkId} address={p.baseToken.address} />
              <span className="num absolute left-2.5 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-bold text-warm backdrop-blur">#{i + 1}</span>
              <span className="num absolute right-2.5 top-2 text-xs"><Change v={p.change.h24} /></span>
            </div>
            <div className="space-y-1 p-3">
              <div className="truncate text-sm font-semibold">{p.baseToken.name || p.baseToken.symbol}</div>
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="truncate">${p.baseToken.symbol}</span>
                <span className="num font-semibold text-text">{usdCompact(p.marketCapUsd ?? p.fdvUsd)} <span className="text-[10px] font-medium text-muted">{p.marketCapUsd ? "MC" : "FDV"}</span></span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span className="truncate">{getNetwork(p.networkId)?.name ?? p.networkId}</span>
                <span className="num">{ageShort(p.createdAt)}</span>
              </div>
            </div>
          </Link>
          </Tilt>
        ))}
      </div>
    </section>
  );
}
