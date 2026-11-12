"use client";

import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { Tilt } from "@/components/fx/Tilt";
import { useT } from "@/components/i18n/I18nProvider";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { Change } from "./TokenRow";

export interface TrendCard {
  key: string;
  href: string;
  name: string;
  symbol: string;
  logo: string | null;
  change: number | null;
  /** Right-hand figure such as "$1.2B MC". */
  figure: string;
  /** Small left line, usually the network or the market rank. */
  sub: string;
  /** Small right line such as pool age. */
  meta: string;
  networkId?: string;
  address?: string;
}

/** Snap-scrolling carousel of real trending coins: on-chain pools first, then CoinGecko coins. About a hundred cards. */
export function TopTrending({ items }: { items: TrendCard[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useT();
  if (items.length === 0) return null;
  const by = (dir: number) => ref.current?.scrollBy({ left: dir * 640, behavior: "smooth" });
  return (
    <section aria-label="Top trending" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="h2 flex items-center gap-2">
          <Flame size={20} className="text-warm" aria-hidden="true" /> {t("home.topTrending")} <span className="num badge">{items.length}</span>
        </h2>
        <div className="flex items-center gap-3">
          <Link href="/trending" className="text-sm font-semibold text-brand transition hover:text-text">View all</Link>
          <button type="button" className="btn btn-icon btn-sm" aria-label="Scroll left" onClick={() => by(-1)}><ChevronLeft size={18} /></button>
          <button type="button" className="btn btn-icon btn-sm" aria-label="Scroll right" onClick={() => by(1)}><ChevronRight size={18} /></button>
        </div>
      </div>
      <div ref={ref} className="scroll-x pb-1">
        {items.map((p, i) => (
          <Tilt key={p.key} className="shrink-0 snap-start">
            <Link href={p.href} className={`card hover-lift block w-[158px] overflow-hidden !rounded-2xl sm:w-[188px] ${i === 0 ? "fx-border" : ""}`}>
              <div className="relative grid h-[88px] place-items-center bg-[radial-gradient(circle_at_50%_30%,var(--aurora-a),transparent_75%)] sm:h-[104px]">
                <TokenLogo src={p.logo} symbol={p.symbol} size={64} networkId={p.networkId} address={p.address} />
                <span className="num absolute left-2.5 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-bold text-warm backdrop-blur">#{i + 1}</span>
                <span className="num absolute right-2.5 top-2 text-xs"><Change v={p.change} /></span>
              </div>
              <div className="space-y-1 p-3">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="truncate">${p.symbol}</span>
                  <span className="num font-semibold text-text">{p.figure}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span className="truncate">{p.sub}</span>
                  <span className="num">{p.meta}</span>
                </div>
              </div>
            </Link>
          </Tilt>
        ))}
      </div>
    </section>
  );
}
