import { AlertTriangle, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountUp } from "@/components/fx/CountUp";
import { Change } from "@/components/home/TokenRow";
import { DexDonut } from "@/components/markets/DexDonut";
import { MoversStrip } from "@/components/markets/MoversStrip";
import { PriceTable } from "@/components/markets/PriceTable";
import { ChainBadge } from "@/components/ui/ChainBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Stat } from "@/components/ui/Kit";
import { LinkTabs } from "@/components/ui/LinkTabs";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { chainColor, topMovers } from "@/lib/market-data/analytics";
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

  const sampled = list && other ? [...new Map([...list.pools, ...other.pools].map((p) => [p.id, p])).values()] : [];
  const movers = topMovers(sampled, 5);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Chains", href: "/chains" }, { label: net.name }]} />
      <header className="card mk-hero" style={{ ["--chain" as string]: chainColor(net.id) }}>
        <div className="flex flex-wrap items-center gap-4 md:gap-5">
          <span className="mk-hero-logo"><ChainBadge networkId={net.id} size={64} /></span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{net.family === "evm" ? "EVM network" : "Network"}</p>
            <h1 className="h1 truncate">{net.name}</h1>
            <p className="mt-1 text-sm text-soft">Native asset {net.nativeSymbol}{net.chainId ? ` · chain id ${net.chainId}` : ""}. Trending and new pools measured from GeckoTerminal.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {net.explorer && <a href={net.explorer} target="_blank" rel="noopener noreferrer" className="btn btn-sm">Explorer <ExternalLink size={14} /></a>}
            <Link href="/add-coin" className="btn btn-primary btn-sm">List a token on {net.name}</Link>
          </div>
        </div>
      </header>

      {stats && (
        <div className="stagger grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 md:grid-cols-4">
          <Stat label="24h volume" value={<CountUp value={stats.volume24hUsd} kind="usd" />} />
          <Stat label="Liquidity" value={<CountUp value={stats.liquidityUsd} kind="usd" />} />
          <Stat label="Pools sampled" value={<CountUp value={stats.pools} />} />
          <Stat label="New pools, 24h" value={<CountUp value={stats.newPools} />} />
          <div className="card col-span-2 p-4 md:col-span-4"><p className="eyebrow">Median 24h change, liquid pools</p><p className="num mt-2 text-xl font-bold"><Change v={stats.medianChange24h} /></p></div>
        </div>
      )}

      <MoversStrip up={movers.up} down={movers.down} name={net.name} />
      {sampled.length > 0 && <DexDonut pools={sampled} />}

      <LinkTabs label="Chain views" activeHref={tab === "new" ? `${base}?tab=new` : base} tabs={[{ href: base, label: "Trending" }, { href: `${base}?tab=new`, label: "New pairs" }]} />
      {!list ? (
        <EmptyState tone="error" icon={AlertTriangle} title="Market data is unavailable" description="The data provider is not responding or is rate limited. Try again in a moment." action={<Link href={base} className="btn btn-sm">Retry</Link>} />
      ) : list.pools.length === 0 ? (
        <EmptyState title={`No pools returned for ${net.name}`} description="The provider has no recent pools for this view." />
      ) : (
        <>
          <PriceTable pools={list.pools} />
          <p className="text-xs text-muted">Source GeckoTerminal{list.stale ? " · cached, provider slow" : ""}. For the full filterable list open <Link className="font-semibold text-brand" href={`/markets${tab === "new" ? "/new" : ""}?network=${net.id}`}>Markets</Link>.</p>
        </>
      )}
    </div>
  );
}
