import { AvailableSlot, CampaignSlot } from "@/components/home/AdSlots";
import { MarketBoard } from "@/components/home/MarketBoard";
import { QuickLinks } from "@/components/home/QuickLinks";
import { Ticker } from "@/components/home/Ticker";
import { TopTrending } from "@/components/home/TopTrending";
import { getBoostedProjects } from "@/lib/ads/boosted";
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

  return (
    <div className="space-y-5">
      {data && <Ticker items={data.organic} />}
      {hero[0] ? <CampaignSlot campaign={hero[0]} variant="hero" /> : <AvailableSlot placement="hero" variant="hero" />}
      {featured[0] ? <CampaignSlot campaign={featured[0]} /> : <AvailableSlot placement="featured" />}
      <BoostedStrip items={boosted} />
      <QuickLinks />
      {data && <TopTrending items={data.organic} />}
      <div id="market" className="scroll-mt-20">
        <MarketBoard initial={data} />
      </div>
    </div>
  );
}
