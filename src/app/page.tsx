import { AvailableSlot, CampaignSlot } from "@/components/home/AdSlots";
import { HomeBoard } from "@/components/home/HomeBoard";
import { Rocket } from "lucide-react";
import Link from "next/link";
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

  const sideAds = await getActiveCampaigns("side");

  return (
    <div className="space-y-5">
      {data && <Ticker items={data.organic} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">{hero[0] ? <CampaignSlot campaign={hero[0]} variant="hero" /> : <AvailableSlot placement="hero" variant="hero" />}</div>
        <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-1">
          {sideAds[0] ? <CampaignSlot campaign={sideAds[0]} variant="card" /> : <AvailableSlot placement="side" variant="card" />}
          <Link href="/boost" className="card hover-lift flex min-h-[132px] flex-col justify-between gap-2 p-5">
            <span className="inline-flex w-fit items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-warm"><Rocket size={12} /> For listed projects</span>
            <span>
              <span className="block font-display text-lg font-bold leading-tight">Boost your project to the top</span>
              <span className="mt-1 block text-sm text-soft">Sponsored visibility from $30. Activates after verified payment.</span>
            </span>
          </Link>
        </div>
      </div>

      {featured[0] ? <CampaignSlot campaign={featured[0]} /> : <div className="hidden lg:block"><AvailableSlot placement="featured" /></div>}
      <BoostedStrip items={boosted} />
      <QuickLinks />
      {data && <TopTrending items={data.organic} />}

      {data && data.organic.length > 0 ? <HomeBoard data={data} /> : <p className="card p-8 text-center text-sm text-muted" role="status">Market data is temporarily unavailable. Lists return automatically when the provider does.</p>}
    </div>
  );
}
