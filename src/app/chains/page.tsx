import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import { ChainsGrid } from "@/components/home/ChainsGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { geckoTerminal } from "@/lib/market-data/providers/geckoterminal";
import { chainPulse } from "@/lib/market-data/pulse";

export const metadata: Metadata = { title: "Chains", description: "Activity across every network we can measure." };
export const revalidate = 60;

export default async function ChainsPage() {
  let chains: ReturnType<typeof chainPulse> = [];
  let failed = false;
  try {
    const [t, n] = await Promise.all([geckoTerminal.trendingPools(), geckoTerminal.newPools()]);
    chains = chainPulse(t.pools, n.pools);
  } catch {
    failed = true;
  }
  return (
    <div>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Chains" }]} eyebrow="Ecosystems" title="Explore by chain" description="Volume, momentum and new pools on every network we can measure. Each figure describes the trending and newly created pools we sample on that chain." />
      {failed || chains.length === 0 ? (
        <EmptyState tone="error" icon={AlertTriangle} title="Chain data is unavailable" description="The data provider is not responding or is rate limited. Try again in a moment." />
      ) : (
        <ChainsGrid chains={chains} limit={100} />
      )}
    </div>
  );
}
