import { AlertTriangle, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Change } from "@/components/home/TokenRow";
import { MarketTable } from "@/components/markets/MarketTable";
import { ChainBadge } from "@/components/ui/ChainBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkTabs } from "@/components/ui/LinkTabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMarketList, type MarketList } from "@/lib/market-data/lists";
import { getNetwork } from "@/lib/market-data/networks";
import { chainPulse } from "@/lib/market-data/pulse";
import { usdCompact } from "@/lib/utils/format";

export const revalidate = 30;
type Props = { params: Promise<{ network: string }>; searchParams: Promise<{ tab?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const n = getNetwork((await params).network);
  return { title: n ? `${n.name} tokens and pools` : "Chain" };
}

export default async function ChainPage({ params, searchParams }: Props) {
  const { network: id } = await params;
  const net = getNetwork(id);
  if (!net?.geckoterminal) notFound();
  const tab = (await searchParams).tab === "new" ? "new" : "trending";
  let list: MarketList | null = null;
  let other: MarketList | null = null;
  try {
    [list, other] = await Promise.all([getMarketList(tab, net.id, 1), getMarketList(tab === "new" ? "trending" : "new", net.id, 1)]);
  } catch {
    list = null;
  }
  const stats = list && other ? chainPulse(tab === "trending" ? list.pools : other.pools, tab === "new" ? list.pools : other.pools).find((c) => c.networkId === net.id) : undefined;
  const base = `/chains/${net.id}`;

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Chains", href: "/chains" }, { label: net.name }]}
        eyebrow={net.family === "evm" ? "EVM network" : "Network"}
        title={net.name}
        description={`Trending and new pools on ${net.name}, measured from GeckoTerminal.`}
        actions={
          <>
            {net.explorer && <a href={net.explorer} target="_blank" rel="noopener noreferrer" className="btn btn-sm">Explorer <ExternalLink size={14} /></a>}
            <Link href="/add-coin" className="btn btn-primary btn-sm">List a token on {net.name}</Link>
          </>
        }
      />
      <div className="flex items-center gap-3"><ChainBadge networkId={net.id} size={36} /><span className="text-sm text-muted">Native asset {net.nativeSymbol}{net.chainId ? ` · chain id ${net.chainId}` : ""}</span></div>

      {stats && (
        <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-4">
          {([["24h volume", usdCompact(stats.volume24hUsd)], ["Liquidity", usdCompact(stats.liquidityUsd)], ["Pools sampled", String(stats.pools)], ["New pools, 24h", String(stats.newPools)]] as const).map(([k, v]) => (
            <div key={k} className="card p-4"><p className="eyebrow">{k}</p><p className="num mt-2.5 text-2xl font-bold tracking-tight">{v}</p></div>
          ))}
          <div className="card col-span-2 p-4 md:col-span-4"><p className="eyebrow">Median 24h change, liquid pools</p><p className="num mt-2 text-xl font-bold"><Change v={stats.medianChange24h} /></p></div>
        </div>
      )}

      <LinkTabs label="Chain views" activeHref={tab === "new" ? `${base}?tab=new` : base} tabs={[{ href: base, label: "Trending" }, { href: `${base}?tab=new`, label: "New pairs" }]} />
      {!list ? (
        <EmptyState tone="error" icon={AlertTriangle} title="Market data is unavailable" description="The data provider is not responding or is rate limited. Try again in a moment." action={<Link href={base} className="btn btn-sm">Retry</Link>} />
      ) : list.pools.length === 0 ? (
        <EmptyState title={`No pools returned for ${net.name}`} description="The provider has no recent pools for this view." />
      ) : (
        <>
          <MarketTable pools={list.pools} sort={null} dir="desc" />
          <p className="text-xs text-muted">Source GeckoTerminal{list.stale ? " · cached, provider slow" : ""}. For the full filterable list open <Link className="font-semibold text-brand" href={`/markets${tab === "new" ? "/new" : ""}?network=${net.id}`}>Markets</Link>.</p>
        </>
      )}
    </div>
  );
}
