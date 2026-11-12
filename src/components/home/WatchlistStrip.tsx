"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { useAlertChecker } from "@/lib/local/alerts";
import { useLivePrices } from "@/lib/local/prices";
import { useLocalWatchlist } from "@/lib/local/watchlist";
import { assetKey } from "@/lib/market-data/identifiers";
import { priceUsd, shortAddress } from "@/lib/utils/format";

/** The watchlist saved on this device, with live prices. Shows nothing until something is watched. Also keeps local price alerts checking on the home page. */
export function WatchlistStrip() {
  useAlertChecker();
  const all = useLocalWatchlist();
  const items = all.slice(0, 12);
  const prices = useLivePrices(items);
  if (items.length === 0) return null;
  return (
    <section aria-label="Your watchlist" className="reveal space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted"><Star size={13} className="text-warm" aria-hidden="true" /> Your watchlist <span className="font-medium normal-case tracking-normal">· on this device</span></h2>
        <Link href="/dashboard/watchlist" className="text-xs font-semibold text-brand hover:text-text">Manage</Link>
      </div>
      <div className="scroll-x">
        {items.map((i, n) => {
          const p = prices.get(assetKey(i.network, i.address));
          return (
            <Link key={`${i.network}:${i.address}`} href={`/token/${i.network}/${i.address}`} className="card-flat hover-lift row-in flex min-w-[170px] shrink-0 items-center gap-3 p-3" style={{ ["--i" as string]: n }}>
              <TokenLogo src={i.logo} symbol={i.symbol || "?"} size={34} networkId={i.network} address={i.address} />
              <span className="min-w-0"><span className="block truncate text-sm font-semibold">{i.symbol || shortAddress(i.address)}</span><span className="num block text-xs text-muted">{p ? priceUsd(p.priceUsd) : <span className="skeleton inline-block h-3 w-12 align-middle" aria-label="Loading price" />}</span></span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
