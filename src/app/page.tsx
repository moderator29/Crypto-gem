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
  const [hero, featured, boosted] = await Promise.all([getActiveCampaigns("hero"), getActiveCampaigns("featured"), getBoostedProjects()]);

  const sideAds = await getActiveCampaigns("side");
  const campaigns = [...new Map([...hero, ...featured, ...sideAds].map((c) => [c.id, c])).values()];
  const boostedKeys = [...(await getBoostedKeys().catch(() => new Set<string>()))];
  const demos = await dexscreener.bannerProfiles(3).catch(() => []);
  const featuredFrom = Math.min(...Object.values(getPlacement("featured")?.prices ?? { 1: 250 }).filter((v): v is number => v !== undefined));

  return (
    <div className="space-y-5">
      {data && <Ticker items={data.organic} />}

      <BannerStrip campaigns={campaigns} demos={demos} from={featuredFrom} />
      <BoostedStrip items={boosted} />
      <QuickLinks />
      {data && <TopTrending items={data.organic} />}

      {data && data.organic.length > 0 ? <HomeBoard data={data} boosted={boostedKeys} /> : <p className="card p-8 text-center text-sm text-muted" role="status">Market data is temporarily unavailable. Lists return automatically when the provider does.</p>}
    </div>
  );
}
