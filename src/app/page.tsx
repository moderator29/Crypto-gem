import { AvailableSlot, CampaignSlot } from "@/components/home/AdSlots";
import { MarketBoard } from "@/components/home/MarketBoard";
import { Ticker } from "@/components/home/Ticker";
import { getActiveCampaigns } from "@/lib/ads/delivery";
import { getHomeData, type HomeData } from "@/lib/market-data/home";

export const revalidate = 30;

export default async function HomePage() {
  let data: HomeData | null = null;
  try {
    data = await getHomeData();
  } catch {
    data = null;
  }
  const [hero, featured] = await Promise.all([getActiveCampaigns("hero"), getActiveCampaigns("featured")]);

  return (
    <div className="space-y-5">
      {data && <Ticker items={data.organic} />}
      {hero[0] ? <CampaignSlot campaign={hero[0]} variant="hero" /> : <AvailableSlot placement="hero" variant="hero" />}
      {featured[0] ? <CampaignSlot campaign={featured[0]} /> : <AvailableSlot placement="featured" />}
      <MarketBoard initial={data} />
    </div>
  );
}
