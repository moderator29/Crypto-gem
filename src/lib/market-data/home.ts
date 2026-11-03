import { dedupeByToken, heatingUp, rankOrganic, type HeatingUp } from "./ranking";
import { geckoTerminal } from "./providers/geckoterminal";
import { providerHealth, type ProviderHealth } from "./http";
import { getNetwork } from "./networks";
import type { PoolSummary } from "./types";

export type RankedPool = PoolSummary & { score: number };

export interface HomeData {
  organic: RankedPool[];
  heating: HeatingUp[];
  fresh: PoolSummary[];
  gainers: PoolSummary[];
  losers: PoolSummary[];
  volume: PoolSummary[];
  meta: { source: "geckoterminal"; stale: boolean; generatedAt: string; health: ProviderHealth[] };
}

/** Aggregates every homepage list from two provider calls. Throws ProviderError when nothing is available. */
export async function getHomeData(networkId?: string | null): Promise<HomeData> {
  const slug = networkId ? getNetwork(networkId)?.geckoterminal : undefined;
  const [trending, fresh] = await Promise.all([geckoTerminal.trendingPools(slug), geckoTerminal.newPools(slug)]);
  const pools = dedupeByToken([...trending.pools, ...fresh.pools]);
  const withData = pools.filter((p) => p.priceUsd !== null);
  const movers = withData.filter((p) => p.change.h24 !== null && (p.liquidityUsd ?? 0) >= 5_000);
  return {
    organic: rankOrganic(trending.pools, 20).map((s) => ({ ...s.pool, score: Math.round(s.score) })),
    heating: heatingUp(pools).slice(0, 12),
    fresh: fresh.pools.slice(0, 20),
    gainers: [...movers].sort((a, b) => (b.change.h24 ?? 0) - (a.change.h24 ?? 0)).slice(0, 12),
    losers: [...movers].sort((a, b) => (a.change.h24 ?? 0) - (b.change.h24 ?? 0)).slice(0, 12),
    volume: [...withData].sort((a, b) => (b.volumeUsd.h24 ?? 0) - (a.volumeUsd.h24 ?? 0)).slice(0, 12),
    meta: { source: "geckoterminal", stale: trending.stale || fresh.stale, generatedAt: new Date().toISOString(), health: providerHealth() },
  };
}
