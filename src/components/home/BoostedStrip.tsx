import { Zap } from "lucide-react";
import Link from "next/link";
import { TokenLogo } from "@/components/ui/TokenLogo";
import type { BoostedProject } from "@/lib/ads/boosted";
import { getNetwork } from "@/lib/market-data/networks";

/** Card style follows the pack tier: standard, highlighted (tier 3 and up) or premium (tier 5 and up). */
function tierClass(priority: number): string {
  if (priority >= 5) return "min-w-[280px] border-[var(--line-3)] bg-gradient-to-br from-[color-mix(in_srgb,var(--brand)_22%,var(--surface-2))] to-[var(--surface-2)] shadow-[0_0_28px_color-mix(in_srgb,var(--neon-glow)_40%,transparent)]";
  if (priority >= 4) return "min-w-[260px] border-[var(--line-3)]";
  if (priority >= 3) return "min-w-[240px] border-[var(--line-2)]";
  return "min-w-[220px]";
}

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
            <Link key={p.id} href={href} rel="sponsored" className={`card-flat hover-lift flex shrink-0 snap-start items-center gap-3 p-3 ${tierClass(p.priority)}`}>
              <TokenLogo src={p.logoUrl} symbol={p.symbol} size={p.priority >= 4 ? 46 : 40} networkId={p.networkId ?? undefined} address={p.address} />
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{p.name}</span><span className="block truncate text-xs text-muted">{p.symbol} · {getNetwork(p.networkId ?? "")?.name ?? ""}</span></span>
              <Zap size={15} className="shrink-0 text-warm" aria-label="Boosted" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
