import { Activity, AlertTriangle, Flame } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CountUp } from "@/components/fx/CountUp";
import { Spotlight } from "@/components/fx/Spotlight";
import { Change, TokenRow } from "@/components/home/TokenRow";
import { ChainRace } from "@/components/markets/ChainRace";
import { PressureGauges } from "@/components/markets/PressureGauges";
import { SurgeList } from "@/components/markets/SurgeList";
import { Stat } from "@/components/ui/Kit";
import { rankSurges } from "@/lib/market-data/analytics";
import { getHomeData } from "@/lib/market-data/home";
import { geckoTerminal } from "@/lib/market-data/providers/geckoterminal";
import { chainPulse, heatBucket } from "@/lib/market-data/pulse";
import { usdCompact } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Market Pulse" };
export const revalidate = 60;

const HEAT = [
  "bg-[color-mix(in_srgb,var(--down)_26%,transparent)]",
  "bg-[color-mix(in_srgb,var(--down)_17%,transparent)]",
  "bg-[color-mix(in_srgb,var(--down)_9%,transparent)]",
  "bg-[var(--surface)]",
  "bg-[color-mix(in_srgb,var(--up)_9%,transparent)]",
  "bg-[color-mix(in_srgb,var(--up)_17%,transparent)]",
  "bg-[color-mix(in_srgb,var(--up)_26%,transparent)]",
];

export default async function PulsePage() {
  let data: Awaited<ReturnType<typeof getHomeData>> | null = null;
  let trending: Awaited<ReturnType<typeof geckoTerminal.trendingPools>>["pools"] = [];
  let fresh: Awaited<ReturnType<typeof geckoTerminal.newPools>>["pools"] = [];
  try {
    data = await getHomeData();
    [trending, fresh] = await Promise.all([geckoTerminal.trendingPools().then((r) => r.pools), geckoTerminal.newPools().then((r) => r.pools)]);
  } catch {
    data = null;
  }
  const chains = data ? chainPulse(trending, fresh) : [];
  const surges = data ? rankSurges([...trending, ...fresh, ...data.heating.map((h) => h.pool)]) : [];

  return (
    <div className="space-y-6">
      <header className="card card-lit relative overflow-hidden p-6 md:p-8">
        <div className="fx-aurora" aria-hidden="true"><i /><i /><i /></div>
        <h1 className="relative z-10 flex items-center gap-3 font-display text-3xl font-bold md:text-4xl"><Activity className="fx-float text-brand" /> Market Pulse</h1>
        <p className="relative z-10 mt-2 max-w-2xl text-soft">Where activity is concentrating right now, measured from live DEX pools. Chain tiles show the median 24h change of liquid pools, so one pumping token cannot colour a whole chain.</p>
      </header>

      {!data ? (
        <div className="card flex items-center gap-2 p-6 text-sm" role="alert"><AlertTriangle size={16} className="text-down" /> Market data is temporarily unavailable. Reload in a minute.</div>
      ) : (
        <>
          <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Chains measured" value={<CountUp value={chains.length} />} />
            <Stat label="24h volume sampled" value={<CountUp value={chains.reduce((a, c) => a + (c.volume24hUsd ?? 0), 0)} kind="usd" />} />
            <Stat label="Pools sampled" value={<CountUp value={trending.length + fresh.length} />} />
            <Stat label="Unusual volume" value={<CountUp value={surges.length} />} note="pools right now" />
          </div>

          <section aria-label="Chain race" className="space-y-3">
            <ChainRace chains={chains} />
          </section>

          <section aria-label="Buy and sell pressure" className="space-y-3">
            <h2 className="font-display text-xl font-bold">Buy vs sell pressure</h2>
            <p className="text-xs text-muted">Share of 24h trades that were buys, across liquid pools on each chain. Counts trades, not dollars.</p>
            <PressureGauges chains={chains} />
          </section>

          <section aria-label="Chain heatmap" className="space-y-3">
            <h2 className="font-display text-xl font-bold">Chain heatmap</h2>
            <div className="stagger grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 md:grid-cols-3 lg:grid-cols-4">
              {chains.map((c) => (
                <Spotlight key={c.networkId} className="rounded-[var(--r-md)]">
                <Link href={`/markets?network=${c.networkId}`} className={`card-flat hover-lift block space-y-1 p-4 ${HEAT[heatBucket(c.medianChange24h) + 3]}`}>
                  <div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{c.name}</span><Change v={c.medianChange24h} /></div>
                  <dl className="num grid grid-cols-2 gap-x-2 text-xs text-soft">
                    <dt className="text-soft">Volume</dt><dd className="text-right">{usdCompact(c.volume24hUsd)}</dd>
                    <dt className="text-soft">Liquidity</dt><dd className="text-right">{usdCompact(c.liquidityUsd)}</dd>
                    <dt className="text-soft">Pools</dt><dd className="text-right">{c.pools} ({c.newPools} new)</dd>
                    <dt className="text-soft">Buys/sells</dt><dd className="text-right">{c.buySellRatio === null ? "—" : c.buySellRatio.toFixed(2)}</dd>
                  </dl>
                </Link>
                </Spotlight>
              ))}
            </div>
            <p className="text-[11px] text-muted">Sample: {trending.length} trending and {fresh.length} newly created pools across all networks, sourced from GeckoTerminal. Chains with few sampled pools are less reliable. Updated every minute.</p>
          </section>

          <section aria-label="Unusual volume" className="space-y-3">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold"><Flame size={18} className="text-warm" /> Unusual volume</h2>
            <p className="text-xs text-muted">Pools whose last hour of volume is at least twice their own average hour over 24h, with at least $5K liquidity.</p>
            <SurgeList surges={surges} />
          </section>

          <section aria-label="Newest pairs" className="space-y-3">
            <h2 className="font-display text-xl font-bold">Newest pairs</h2>
            <div className="grid gap-2">{data.fresh.slice(0, 8).map((p, i) => <TokenRow key={p.id} pool={p} rank={i + 1} />)}</div>
          </section>

          <section className="card p-5 text-sm text-soft" aria-label="Not covered yet">
            <h2 className="mb-1 font-display text-lg font-bold text-text">Not shown, on purpose</h2>
            Whale and smart-money activity, sector heatmaps and sentiment indices need data sources we have not connected, so they are not displayed rather than approximated.
          </section>
        </>
      )}
    </div>
  );
}
