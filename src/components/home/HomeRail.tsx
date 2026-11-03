import { Activity, Bot, Flame } from "lucide-react";
import Link from "next/link";
import { TokenLogo } from "@/components/ui/TokenLogo";
import type { HeatingUp } from "@/lib/market-data/ranking";
import { getNetwork } from "@/lib/market-data/networks";
import { Change } from "./TokenRow";

/** Wide-screen right rail: measured heating-up tokens and shortcuts. Hidden below xl where the same lists exist as tabs. */
export function HomeRail({ heating }: { heating: HeatingUp[] }) {
  return (
    <aside className="hidden space-y-4 xl:block" aria-label="Market sidebar">
      <div className="sticky top-20 space-y-4">
        <section className="glass space-y-3 p-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Flame size={17} className="text-warm" /> Heating up</h2>
          {heating.length === 0 ? (
            <p className="text-sm text-soft">Nothing is running well above its own 24h pace with meaningful liquidity right now.</p>
          ) : (
            <ul className="space-y-1">
              {heating.slice(0, 5).map((h) => (
                <li key={h.pool.id}>
                  <Link href={`/token/${h.pool.networkId}/${h.pool.baseToken.address}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-[var(--border)]">
                    <TokenLogo src={h.pool.baseToken.imageUrl} symbol={h.pool.baseToken.symbol} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{h.pool.baseToken.symbol}</span>
                      <span className="block truncate text-[11px] text-muted">{getNetwork(h.pool.networkId)?.name} · {h.ratio.toFixed(1)}x hourly pace</span>
                    </span>
                    <Change v={h.pool.change.h24} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <Link href="/pulse" className="glass hover-lift flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--border)] text-brand"><Activity size={18} /></span>
          <span><span className="block font-semibold">Market Pulse</span><span className="block text-xs text-muted">Chain heatmap and unusual volume</span></span>
        </Link>
        <Link href="/copilot" className="glass hover-lift flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--border)] text-brand"><Bot size={18} /></span>
          <span><span className="block font-semibold">Ask the Copilot</span><span className="block text-xs text-muted">Research any token with live data</span></span>
        </Link>
      </div>
    </aside>
  );
}
