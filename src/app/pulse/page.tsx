import { Activity, AlertTriangle, Flame } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Change, TokenRow } from "@/components/home/TokenRow";
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

  return (
    <div className="space-y-6">
      <header className="card p-6 md:p-8">
        <h1 className="flex items-center gap-3 font-display text-3xl font-bold md:text-4xl"><Activity className="text-brand" /> Market Pulse</h1>
        <p className="mt-2 max-w-2xl text-soft">Where activity is concentrating right now, measured from live DEX pools. Chain tiles show the median 24h change of liquid pools, so one pumping token cannot colour a whole chain.</p>
      </header>

      {!data ? (
        <div className="card flex items-center gap-2 p-6 text-sm" role="alert"><AlertTriangle size={16} className="text-down" /> Market data is temporarily unavailable. Reload in a minute.</div>
      ) : (
        <>
          <section aria-label="Chain heatmap" className="space-y-3">
            <h2 className="font-display text-xl font-bold">Chain heatmap</h2>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
              {chains.map((c) => (
                <Link key={c.networkId} href={`/markets?network=${c.networkId}`} className={`card-flat hover-lift space-y-1 p-4 ${HEAT[heatBucket(c.medianChange24h) + 3]}`}>
                  <div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{c.name}</span><Change v={c.medianChange24h} /></div>
                  <dl className="num grid grid-cols-2 gap-x-2 text-xs text-soft">
                    <dt className="text-soft">Volume</dt><dd className="text-right">{usdCompact(c.volume24hUsd)}</dd>
                    <dt className="text-soft">Liquidity</dt><dd className="text-right">{usdCompact(c.liquidityUsd)}</dd>
                    <dt className="text-soft">Pools</dt><dd className="text-right">{c.pools} ({c.newPools} new)</dd>
                    <dt className="text-soft">Buys/sells</dt><dd className="text-right">{c.buySellRatio === null ? "—" : c.buySellRatio.toFixed(2)}</dd>
                  </dl>
                </Link>
              ))}
            </div>
            <p className="text-[11px] text-muted">Sample: {trending.length} trending and {fresh.length} newly created pools across all networks, sourced from GeckoTerminal. Chains with few sampled pools are less reliable. Updated every minute.</p>
          </section>

          <section aria-label="Unusual volume" className="space-y-3">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold"><Flame size={18} className="text-warm" /> Unusual volume</h2>
            {data.heating.length === 0 ? <p className="card p-5 text-sm text-soft">No pool shows last-hour volume well above its own 24h pace with meaningful liquidity right now.</p> : (
              <div className="grid gap-2">{data.heating.slice(0, 8).map((h, i) => <TokenRow key={h.pool.id} pool={h.pool} rank={i + 1} note={h.reason} />)}</div>
            )}
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
