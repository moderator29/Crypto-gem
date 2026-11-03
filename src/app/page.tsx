import { Bot, Flame, Sparkles } from "lucide-react";
import Link from "next/link";
import { BoostedStrip } from "@/components/home/BoostedStrip";
import { ChainsGrid } from "@/components/home/ChainsGrid";
import { HomeHero, OverviewCard } from "@/components/home/HomeHero";
import { HomeMarkets } from "@/components/home/HomeMarkets";
import { LiveRail } from "@/components/home/LiveRail";
import { MiniList } from "@/components/home/MiniList";
import { ProjectsBand } from "@/components/home/ProjectsBand";
import { TopTrending } from "@/components/home/TopTrending";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getBoostedProjects } from "@/lib/ads/boosted";
import { getActiveCampaigns } from "@/lib/ads/delivery";
import { getHomeData, type HomeData } from "@/lib/market-data/home";
import { chainPulse } from "@/lib/market-data/pulse";
import { buildRailItems } from "@/lib/rail";

export const revalidate = 30;

export default async function HomePage() {
  let data: HomeData | null = null;
  try {
    data = await getHomeData();
  } catch {
    data = null;
  }
  const chains = data ? chainPulse(data.organic, data.fresh) : [];
  const [hero, featured, side, boosted] = await Promise.all([getActiveCampaigns("hero"), getActiveCampaigns("featured"), getActiveCampaigns("side"), getBoostedProjects()]);
  const campaigns = [...new Map([...hero, ...featured, ...side].map((c) => [c.id, c])).values()];
  const rail = buildRailItems({ data, chains, campaigns });

  return (
    <div className="space-y-10 md:space-y-16">
      <HomeHero data={data} chains={chains} />
      <LiveRail items={rail} />
      <div className="lg:hidden"><OverviewCard data={data} chains={chains} /></div>
      <BoostedStrip items={boosted} />

      {data && data.organic.length > 0 ? (
        <>
          <section aria-label="Trending now"><TopTrending items={data.organic} /></section>

          <HomeMarkets rows={data.organic.slice(0, 10)} />

          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2 lg:items-start">
            <MiniList title="New pairs" href="/markets/new" icon={<Sparkles size={16} className="text-brand" aria-hidden="true" />} pools={data.fresh.slice(0, 6).map((pool) => ({ pool }))} />
            {data.heating.length > 0 ? <MiniList title="Heating up" href="/markets/heating" icon={<Flame size={16} className="text-warm" aria-hidden="true" />} pools={data.heating.slice(0, 6).map((h) => ({ pool: h.pool, note: `${h.ratio.toFixed(1)}x hourly pace` }))} /> : <EmptyState title="Nothing unusual right now" description="No pool is running well above its own pace with meaningful liquidity." />}
          </div>

          {chains.filter((c) => c.pools >= 2).length > 0 && (
            <Panel title="Explore by chain" href="/chains" linkLabel="All chains" note="Measured across the pools we sample">
              <div className="p-3 md:p-4"><ChainsGrid chains={chains.filter((c) => c.pools >= 2)} /></div>
            </Panel>
          )}
        </>
      ) : (
        <EmptyState tone="error" title="Market data is temporarily unavailable" description="The data provider is not responding or is rate limited. Discovery lists return automatically when it recovers." action={<Link href="/" className="btn btn-sm">Try again</Link>} />
      )}

      <section aria-label="For projects">
        <SectionHeader title="For projects" description="List, boost and advertise with measured, clearly labelled results." />
        <ProjectsBand />
      </section>

      <section aria-label="Tools" className="stagger grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
        <Link href="/copilot" className="card card-lit hover-lift flex items-center gap-4 p-5">
          <span className="icon-tile h-12 w-12 shrink-0 rounded-lg"><Bot size={22} aria-hidden="true" /></span>
          <span><span className="h3 block">AI Copilot</span><span className="mt-0.5 block text-sm text-soft">Ask about any token. Answers come from live market data, with facts and interpretation kept apart.</span></span>
        </Link>
        <Link href="/pulse" className="card hover-lift flex items-center gap-4 p-5">
          <span className="icon-tile h-12 w-12 shrink-0 rounded-lg"><Flame size={22} aria-hidden="true" /></span>
          <span><span className="h3 block">Market Pulse</span><span className="mt-0.5 block text-sm text-soft">A chain heatmap and unusual volume, measured from the pools we sample.</span></span>
        </Link>
      </section>
    </div>
  );
}
