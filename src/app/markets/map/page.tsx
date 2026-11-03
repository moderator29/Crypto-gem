import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { HeatMap } from "@/components/markets/HeatMap";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkTabs } from "@/components/ui/LinkTabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { getHomeData, type HomeData } from "@/lib/market-data/home";
import { VIEWS } from "@/lib/market-data/lists";

export const revalidate = 60;
export const metadata: Metadata = { title: "Price map", description: "Tokens sized by 24h volume and coloured by 24h change." };

export default async function MapPage() {
  let data: HomeData | null = null;
  try {
    data = await getHomeData();
  } catch {
    data = null;
  }
  const pools = data ? [...new Map([...data.organic, ...data.fresh, ...data.volume, ...data.gainers, ...data.losers].map((p) => [p.id, p])).values()] : [];
  const tabs = [...VIEWS.map((v) => ({ href: v.path, label: v.label })), { href: "/markets/map", label: "Map" }];
  return (
    <div>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Markets", href: "/markets" }, { label: "Map" }]} eyebrow="Markets" title="Price map" description="Each tile is a token we sample. Size is 24h volume and colour is 24h change. Select a tile to open the token." />
      <div className="space-y-5">
        <LinkTabs tabs={tabs} activeHref="/markets/map" label="Market views" />
        {data ? <HeatMap pools={pools} height={520} /> : <EmptyState tone="error" icon={AlertTriangle} title="Map data is unavailable" description="The data provider is not responding or is rate limited. Try again in a moment." />}
      </div>
    </div>
  );
}
