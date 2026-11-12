"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { accessToken } from "@/lib/auth/client";
import { priceUsd } from "@/lib/utils/format";

interface Item { network: string; address: string; live: { priceUsd: number | null; name: string | null; symbol: string | null; imageUrl: string | null } | null }

/** The signed-in person's own watchlist with live prices. Shows nothing when signed out, empty, or unavailable. */
export function WatchlistStrip() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    let live = true;
    void (async () => {
      const jwt = await accessToken();
      if (!jwt) return;
      try {
        const r = await fetch("/api/watchlist", { headers: { Authorization: `Bearer ${jwt}` } });
        if (!r.ok) return;
        const j = (await r.json()) as { items: Item[] };
        if (live) setItems(j.items.filter((i) => i.live?.symbol).slice(0, 12));
      } catch {
        /* nothing to show */
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  if (items.length === 0) return null;
  return (
    <section aria-label="Your watchlist" className="reveal space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted"><Star size={13} className="text-warm" aria-hidden="true" /> Your watchlist</h2>
        <Link href="/dashboard/watchlist" className="text-xs font-semibold text-brand hover:text-text">Manage</Link>
      </div>
      <div className="scroll-x">
        {items.map((i, n) => (
          <Link key={`${i.network}:${i.address}`} href={`/token/${i.network}/${i.address}`} className="card-flat hover-lift row-in flex min-w-[190px] shrink-0 items-center gap-3 p-3" style={{ ["--i" as string]: n }}>
            <TokenLogo src={i.live?.imageUrl} symbol={i.live?.symbol ?? "?"} size={34} networkId={i.network} address={i.address} />
            <span className="min-w-0"><span className="block truncate text-sm font-semibold">{i.live?.symbol}</span><span className="num block text-xs text-muted">{priceUsd(i.live?.priceUsd ?? null)}</span></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
