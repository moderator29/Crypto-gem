"use client";

import { History, X } from "lucide-react";
import Link from "next/link";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { clearRecentTokens, useRecentTokens } from "@/lib/recentTokens";

/** Tokens this person opened recently. Stored only in their browser. Hidden until there is something to show. */
export function RecentlyViewed() {
  const items = useRecentTokens();
  if (items.length === 0) return null;
  return (
    <section aria-label="Recently viewed" className="reveal space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted"><History size={13} aria-hidden="true" /> Recently viewed</h2>
        <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-muted transition hover:text-text" onClick={clearRecentTokens}><X size={12} aria-hidden="true" /> Clear</button>
      </div>
      <div className="scroll-x">
        {items.map((t, i) => (
          <Link key={`${t.network}:${t.address}`} href={`/token/${t.network}/${t.address}`} className="chip row-in !min-h-11 !pl-1.5" style={{ ["--i" as string]: i }}>
            <TokenLogo src={t.logo} symbol={t.symbol} size={28} networkId={t.network} address={t.address} />
            <span className="font-semibold normal-case tracking-normal">{t.symbol}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
