import { coingecko, type CoinRow } from "./providers/coingecko";

export type CoinTab = "trending" | "gainers" | "losers" | "marketcap" | "volume";

export const COIN_TABS: Array<{ id: CoinTab; label: string; blurb: string }> = [
  { id: "trending", label: "Trending", blurb: "Coins people are looking up right now, then the most traded coins by 24h volume." },
  { id: "gainers", label: "Top gainers", blurb: "Biggest 24h gains among the 250 most traded coins." },
  { id: "losers", label: "Top losers", blurb: "Biggest 24h drops among the 250 most traded coins." },
  { id: "marketcap", label: "Market cap", blurb: "Every coin ranked by market capitalisation." },
  { id: "volume", label: "Volume", blurb: "Every coin ranked by 24h trading volume." },
];

export const PER_PAGE = 100;
export const parseCoinTab = (v: string | undefined): CoinTab => (COIN_TABS.some((t) => t.id === v) ? (v as CoinTab) : "trending");
export const parseCoinPage = (v: string | undefined): number => Math.min(500, Math.max(1, Math.floor(Number(v)) || 1));

export interface CoinPage {
  rows: CoinRow[];
  total: number | null;
  page: number;
  pages: number;
  /** Tabs that rank a fixed top 250 have a short page count. */
  capped: boolean;
}

/** One page of ranked coins from CoinGecko. Throws when the provider has nothing. */
export async function getCoinPage(tab: CoinTab, page: number): Promise<CoinPage> {
  const total = await coingecko.activeCoins().catch(() => null);
  const allPages = total ? Math.min(500, Math.ceil(total / PER_PAGE)) : 500;
  if (tab === "marketcap" || tab === "volume") {
    const rows = await coingecko.markets(tab === "marketcap" ? "market_cap_desc" : "volume_desc", page, PER_PAGE);
    return { rows, total, page, pages: allPages, capped: false };
  }
  if (tab === "trending") {
    const [ids, vol] = await Promise.all([coingecko.trendingIds().catch(() => [] as string[]), coingecko.markets("volume_desc", page, PER_PAGE)]);
    if (page > 1) return { rows: vol, total, page, pages: allPages, capped: false };
    const hot = await coingecko.marketsByIds(ids).catch(() => [] as CoinRow[]);
    const order = new Map(ids.map((id, i) => [id, i]));
    hot.sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
    const seen = new Set(hot.map((r) => r.id));
    return { rows: [...hot, ...vol.filter((r) => !seen.has(r.id))].slice(0, PER_PAGE), total, page, pages: allPages, capped: false };
  }
  const [a, b] = await Promise.all([coingecko.markets("volume_desc", 1, 250), coingecko.markets("volume_desc", 2, 250).catch(() => [] as CoinRow[])]);
  const ranked = [...a, ...b].filter((r) => r.change24h !== null).sort((x, y) => (tab === "gainers" ? (y.change24h ?? 0) - (x.change24h ?? 0) : (x.change24h ?? 0) - (y.change24h ?? 0)));
  const pages = Math.max(1, Math.ceil(ranked.length / PER_PAGE));
  const p = Math.min(page, pages);
  return { rows: ranked.slice((p - 1) * PER_PAGE, p * PER_PAGE), total: ranked.length, page: p, pages, capped: true };
}

/** About 100 real coins for the home carousel: on-chain trending first (supplied by the caller), then CoinGecko by volume. */
export async function getCarouselCoins(limit = 100): Promise<CoinRow[]> {
  const [ids, vol] = await Promise.all([coingecko.trendingIds().catch(() => [] as string[]), coingecko.markets("volume_desc", 1, limit)]);
  const hot = await coingecko.marketsByIds(ids).catch(() => [] as CoinRow[]);
  const seen = new Set(hot.map((r) => r.id));
  return [...hot, ...vol.filter((r) => !seen.has(r.id))].slice(0, limit);
}
