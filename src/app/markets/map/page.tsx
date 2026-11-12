import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { Suspense } from "react";
import { MapView } from "@/components/markets/MapView";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkTabs } from "@/components/ui/LinkTabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { getHomeData, type HomeData } from "@/lib/market-data/home";
import { VIEWS } from "@/lib/market-data/lists";

export const revalidate = 60;
export const metadata: Metadata = { title: "Price map", description: "Tokens sized by volume or liquidity and coloured by 1h, 6h or 24h change." };

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
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Markets", href: "/markets" }, { label: "Map" }]} eyebrow="Markets" title="Price map" description="Each tile is a token we sample. Size is volume or liquidity and colour is the 1h, 6h or 24h change. Hover or focus a tile for detail, select it to open the token." />
      <div className="space-y-5">
        <LinkTabs tabs={tabs} activeHref="/markets/map" label="Market views" />
        {data ? <Suspense fallback={<div className="skeleton mk-map" />}><MapView pools={pools} /></Suspense> : <EmptyState tone="error" icon={AlertTriangle} title="Map data is unavailable" description="The data provider is not responding or is rate limited. Try again in a moment." />}
      </div>
    </div>
  );
}
