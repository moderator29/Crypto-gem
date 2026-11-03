import { geckoTerminal } from "./providers/geckoterminal";
import { dedupeByToken, heatingUp, rankOrganic } from "./ranking";
import { getNetwork } from "./networks";
import type { PoolSummary } from "./types";

export type MarketView = "trending" | "new" | "heating" | "gainers" | "losers" | "volume";
export type SortKey = "price" | "h1" | "h24" | "cap" | "volume" | "liquidity" | "age";
export type SortDir = "asc" | "desc";

export const VIEWS: Array<{ id: MarketView; label: string; path: string; blurb: string }> = [
  { id: "trending", label: "Trending", path: "/markets", blurb: "Ranked by an organic score of volume, liquidity, activity, momentum and freshness. Paid placements never change this order." },
  { id: "new", label: "New pairs", path: "/markets/new", blurb: "Freshly created liquidity pools, newest first. New pools carry higher risk." },
  { id: "heating", label: "Heating up", path: "/markets/heating", blurb: "Hourly volume well above the pool's own 24h pace, with meaningful liquidity." },
  { id: "gainers", label: "Gainers", path: "/markets/gainers", blurb: "Largest 24h gains among liquid pools in the set we sample. Not a ranking of the whole market." },
  { id: "losers", label: "Losers", path: "/markets/losers", blurb: "Largest 24h declines among liquid pools in the set we sample." },
  { id: "volume", label: "Volume", path: "/markets/volume", blurb: "Highest 24h trading volume in the set we sample." },
];

export const MAX_PAGE = 10;

export function parseView(seg: string | undefined): MarketView | null {
  if (!seg) return "trending";
  return VIEWS.some((v) => v.id === seg) ? (seg as MarketView) : null;
}

const SORT_KEYS: SortKey[] = ["price", "h1", "h24", "cap", "volume", "liquidity", "age"];
export const parseSort = (v: string | undefined): SortKey | null => (SORT_KEYS.includes(v as SortKey) ? (v as SortKey) : null);
export const parseDir = (v: string | undefined): SortDir => (v === "asc" ? "asc" : "desc");
export const parsePage = (v: string | undefined): number => Math.min(MAX_PAGE, Math.max(1, Math.floor(Number(v)) || 1));

const VALUE: Record<SortKey, (p: PoolSummary) => number | null> = {
  price: (p) => p.priceUsd,
  h1: (p) => p.change.h1,
  h24: (p) => p.change.h24,
  cap: (p) => (p.marketCapUsd && p.marketCapUsd > 0 ? p.marketCapUsd : p.fdvUsd),
  volume: (p) => p.volumeUsd.h24,
  liquidity: (p) => p.liquidityUsd,
  age: (p) => (p.createdAt ? Date.parse(p.createdAt) : null),
};

/** Sorts a copy. Missing values always sink to the bottom whichever direction is chosen. */
export function sortPools(pools: PoolSummary[], key: SortKey | null, dir: SortDir): PoolSummary[] {
  if (!key) return pools;
  const f = VALUE[key];
  return [...pools].sort((a, b) => {
    const x = f(a);
    const y = f(b);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return dir === "desc" ? y - x : x - y;
  });
}

export interface MarketList {
  pools: PoolSummary[];
  /** Provider paging is available for these views only. Sampled views have a single page. */
  paged: boolean;
  hasMore: boolean;
  stale: boolean;
  sampled: number;
}

const LIQUID = 5_000;
const unique = (lists: PoolSummary[][]): PoolSummary[] => dedupeByToken(lists.flat());

/** Builds one market view from provider data. Views that rank a sample say so on the page. */
export async function getMarketList(view: MarketView, networkId: string | null, page: number): Promise<MarketList> {
  const slug = networkId ? getNetwork(networkId)?.geckoterminal : undefined;
  if (view === "trending") {
    const r = await geckoTerminal.trendingPools(slug, page);
    const ranked = rankOrganic(r.pools, 50).map((s) => s.pool);
    return { pools: ranked, paged: true, hasMore: r.pools.length >= 20 && page < MAX_PAGE, stale: r.stale, sampled: r.pools.length };
  }
  if (view === "new") {
    const r = await geckoTerminal.newPools(slug, page);
    const pools = [...r.pools].sort((a, b) => Date.parse(b.createdAt ?? "0") - Date.parse(a.createdAt ?? "0"));
    return { pools, paged: true, hasMore: r.pools.length >= 20 && page < MAX_PAGE, stale: r.stale, sampled: r.pools.length };
  }
  const [t1, t2, n1] = await Promise.all([geckoTerminal.trendingPools(slug, 1), geckoTerminal.trendingPools(slug, 2).catch(() => ({ pools: [], stale: false })), geckoTerminal.newPools(slug, 1)]);
  const all = unique([t1.pools, t2.pools, n1.pools]);
  const stale = t1.stale || n1.stale;
  const liquid = all.filter((p) => (p.liquidityUsd ?? 0) >= LIQUID && p.priceUsd !== null);
  let pools: PoolSummary[];
  if (view === "heating") pools = heatingUp(all).map((h) => h.pool);
  else if (view === "gainers") pools = sortPools(liquid.filter((p) => p.change.h24 !== null), "h24", "desc").slice(0, 40);
  else if (view === "losers") pools = sortPools(liquid.filter((p) => p.change.h24 !== null), "h24", "asc").slice(0, 40);
  else pools = sortPools(liquid, "volume", "desc").slice(0, 40);
  return { pools, paged: false, hasMore: false, stale, sampled: all.length };
}
