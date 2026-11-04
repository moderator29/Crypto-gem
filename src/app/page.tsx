import { chainPulse } from "@/lib/market-data/pulse";
import { Movers } from "@/components/home/Movers";
import { RecentlyViewed } from "@/components/home/RecentlyViewed";
import { PulseStrip } from "@/components/home/PulseStrip";
import { getFearGreed } from "@/lib/market-data/providers/fng";
import { BannerStrip } from "@/components/home/BannerStrip";
import { getPlacement } from "@/lib/ads/catalog";
import { dexscreener } from "@/lib/market-data/providers/dexscreener";
import { HomeBoard } from "@/components/home/HomeBoard";
import { QuickLinks } from "@/components/home/QuickLinks";
import { Ticker } from "@/components/home/Ticker";
import { TopTrending } from "@/components/home/TopTrending";
import { getBoostedKeys, getBoostedProjects } from "@/lib/ads/boosted";
import { getActiveCampaigns } from "@/lib/ads/delivery";
import { BoostedStrip } from "@/components/home/BoostedStrip";
import { getHomeData, type HomeData } from "@/lib/market-data/home";

export const revalidate = 30;

export default async function HomePage() {
  let data: HomeData | null = null;
  try {
    data = await getHomeData();
  } catch {
    data = null;
  }
  const chains = data ? chainPulse(data.organic, data.fresh) : [];
  const [hero, featured, boosted] = await Promise.all([getActiveCampaigns("hero"), getActiveCampaigns("featured"), getBoostedProjects()]);

  const sideAds = await getActiveCampaigns("side");
  const campaigns = [...new Map([...hero, ...featured, ...sideAds].map((c) => [c.id, c])).values()];
  const boostedKeys = [...(await getBoostedKeys().catch(() => new Set<string>()))];
  const fng = await getFearGreed();
  const demos = await dexscreener.bannerProfiles(3).catch(() => []);
  const featuredFrom = Math.min(...Object.values(getPlacement("featured")?.prices ?? { 1: 250 }).filter((v): v is number => v !== undefined));

  return (
    <div className="relative isolate space-y-5">
      <div className="fx-aurora" aria-hidden="true"><i /><i /><i /></div>
      {data && <Ticker items={data.organic} />}

      {data && data.organic.length > 0 && <PulseStrip data={data} chains={chains} fng={fng} />}
      <RecentlyViewed />
      <div className="fx-divider" aria-hidden="true" />
      <div className="reveal"><BannerStrip campaigns={campaigns} demos={demos} from={featuredFrom} /></div>
      <BoostedStrip items={boosted} />
      <div className="fx-divider" aria-hidden="true" />
      <div className="reveal"><QuickLinks /></div>
      {data && <div className="reveal"><TopTrending items={data.organic} /></div>}

      {data && <Movers gainers={data.gainers} losers={data.losers} />}
      {data && data.organic.length > 0 ? <HomeBoard data={data} boosted={boostedKeys} /> : <p className="card p-8 text-center text-sm text-muted" role="status">Market data is temporarily unavailable. Lists return automatically when the provider does.</p>}
    </div>
  );
}
