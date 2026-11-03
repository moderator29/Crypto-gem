import { Zap } from "lucide-react";
import Link from "next/link";
import { TokenLogo } from "@/components/ui/TokenLogo";
import type { BoostedProject } from "@/lib/ads/boosted";
import { getNetwork } from "@/lib/market-data/networks";

/** Sponsored boosted projects. Separate from organic lists, always labelled. */
export function BoostedStrip({ items }: { items: BoostedProject[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Boosted projects (sponsored)" className="space-y-2">
      <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted"><Zap size={13} className="text-warm" /> Boosted · Sponsored</h2>
      <div className="scroll-x">
        {items.map((p) => {
          const href = p.networkId && p.address ? `/token/${p.networkId}/${p.address}` : "/";
          return (
            <Link key={p.id} href={href} rel="sponsored" className="card-flat hover-lift flex min-w-[220px] shrink-0 snap-start items-center gap-3 p-3">
              <TokenLogo src={p.logoUrl} symbol={p.symbol} size={40} networkId={p.networkId ?? undefined} address={p.address} />
              <span className="min-w-0"><span className="block truncate font-semibold">{p.name}</span><span className="block truncate text-xs text-muted">{p.symbol} · {getNetwork(p.networkId ?? "")?.name ?? ""}</span></span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
