import { cached } from "../../cache";
import { ProviderError } from "../../errors";
import { fetchJson } from "../../http";

const PROVIDER = "coingecko";

function endpoint(): { base: string; headers: Record<string, string> } {
  const key = process.env.COINGECKO_API_KEY;
  if (key && process.env.COINGECKO_API_PLAN === "pro") return { base: "https://pro-api.coingecko.com/api/v3", headers: { "x-cg-pro-api-key": key } };
  if (key) return { base: "https://api.coingecko.com/api/v3", headers: { "x-cg-demo-api-key": key } };
  return { base: "https://api.coingecko.com/api/v3", headers: {} };
}

async function cg<T>(path: string, ttlMs: number): Promise<T> {
  const { base, headers } = endpoint();
  const res = await cached(`cg:${path}`, ttlMs, () => fetchJson<T>(`${base}${path}`, { provider: PROVIDER, headers }), { staleMs: 15 * 60_000 });
  return res.value;
}

export interface CoinGeckoContractInfo {
  id: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  description: string | null;
  homepage: string | null;
  twitter: string | null;
  telegram: string | null;
  discord: string | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  volume24hUsd: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  genesisDate: string | null;
  url: string;
  observedAt: string;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

interface RawCoin {
  id: string;
  name: string;
  symbol: string;
  image?: { large?: string };
  description?: { en?: string };
  links?: { homepage?: string[]; twitter_screen_name?: string; telegram_channel_identifier?: string; chat_url?: string[] };
  genesis_date?: string | null;
  market_data?: {
    current_price?: { usd?: number };
    market_cap?: { usd?: number };
    fully_diluted_valuation?: { usd?: number };
    total_volume?: { usd?: number };
    circulating_supply?: number;
    total_supply?: number;
    max_supply?: number;
  };
}

export interface CoinRow {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  rank: number | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  change1h: number | null;
  change24h: number | null;
  change7d: number | null;
  spark: number[];
}

interface RawMarket {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  market_cap_rank?: number | null;
  current_price?: number | null;
  market_cap?: number | null;
  total_volume?: number | null;
  price_change_percentage_1h_in_currency?: number | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  sparkline_in_7d?: { price?: number[] };
}

const toRow = (c: RawMarket): CoinRow => ({
  id: c.id,
  symbol: c.symbol.toUpperCase(),
  name: c.name,
  image: str(c.image),
  rank: c.market_cap_rank ?? null,
  priceUsd: num(c.current_price),
  marketCapUsd: num(c.market_cap),
  volume24hUsd: num(c.total_volume),
  change1h: num(c.price_change_percentage_1h_in_currency),
  change24h: num(c.price_change_percentage_24h_in_currency),
  change7d: num(c.price_change_percentage_7d_in_currency),
  spark: (c.sparkline_in_7d?.price ?? []).filter((n, i) => i % 4 === 0 && Number.isFinite(n)),
});

export const coingecko = {
  /** Ranked coin list with 7 day sparklines in one call. `order` is market_cap_desc or volume_desc. */
  async markets(order: "market_cap_desc" | "volume_desc", page: number, perPage: number): Promise<CoinRow[]> {
    const raw = await cg<RawMarket[]>(`/coins/markets?vs_currency=usd&order=${order}&per_page=${perPage}&page=${page}&sparkline=true&price_change_percentage=1h,24h,7d`, 3 * 60_000);
    return raw.map(toRow);
  },

  /** Coins CoinGecko users are searching for right now (about 15). Ids only; rows come from markets(). */
  async trendingIds(): Promise<string[]> {
    const raw = await cg<{ coins?: Array<{ item: { id: string } }> }>("/search/trending", 5 * 60_000);
    return (raw.coins ?? []).map((c) => c.item.id);
  },

  async marketsByIds(ids: string[]): Promise<CoinRow[]> {
    if (ids.length === 0) return [];
    const raw = await cg<RawMarket[]>(`/coins/markets?vs_currency=usd&ids=${ids.map(encodeURIComponent).join(",")}&order=market_cap_desc&per_page=${Math.min(250, ids.length)}&page=1&sparkline=true&price_change_percentage=1h,24h,7d`, 3 * 60_000);
    return raw.map(toRow);
  },

  /** Total number of active coins CoinGecko tracks, for the "N coins" counter. */
  async activeCoins(): Promise<number | null> {
    const raw = await cg<{ data?: { active_cryptocurrencies?: number } }>("/global", 10 * 60_000);
    return num(raw.data?.active_cryptocurrencies);
  },

  /** Full detail for one coin: links, platforms (contracts) and market data. Null when CoinGecko has no such id. */
  async coin(id: string) {
    try {
      const c = await cg<{
        id: string; symbol: string; name: string; image?: { large?: string }; market_cap_rank?: number | null; categories?: string[];
        description?: { en?: string }; links?: { homepage?: string[]; twitter_screen_name?: string; telegram_channel_identifier?: string; subreddit_url?: string; repos_url?: { github?: string[] } };
        platforms?: Record<string, string>; genesis_date?: string | null;
        market_data?: { current_price?: { usd?: number }; market_cap?: { usd?: number }; fully_diluted_valuation?: { usd?: number }; total_volume?: { usd?: number }; high_24h?: { usd?: number }; low_24h?: { usd?: number }; ath?: { usd?: number }; atl?: { usd?: number }; circulating_supply?: number; total_supply?: number; max_supply?: number; price_change_percentage_24h?: number; price_change_percentage_7d?: number; price_change_percentage_30d?: number; sparkline_7d?: { price?: number[] } };
      }>(`/coins/${encodeURIComponent(id)}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=true`, 5 * 60_000);
      const md = c.market_data;
      return {
        id: c.id, symbol: c.symbol.toUpperCase(), name: c.name, image: str(c.image?.large), rank: c.market_cap_rank ?? null, categories: (c.categories ?? []).slice(0, 5),
        description: str(c.description?.en), website: str(c.links?.homepage?.[0]),
        twitter: c.links?.twitter_screen_name ? `https://x.com/${c.links.twitter_screen_name}` : null,
        telegram: c.links?.telegram_channel_identifier ? `https://t.me/${c.links.telegram_channel_identifier}` : null,
        github: str(c.links?.repos_url?.github?.[0]), platforms: Object.fromEntries(Object.entries(c.platforms ?? {}).filter(([k, v]) => k && v)),
        genesisDate: str(c.genesis_date),
        priceUsd: num(md?.current_price?.usd), marketCapUsd: num(md?.market_cap?.usd), fdvUsd: num(md?.fully_diluted_valuation?.usd), volume24hUsd: num(md?.total_volume?.usd),
        high24h: num(md?.high_24h?.usd), low24h: num(md?.low_24h?.usd), ath: num(md?.ath?.usd), atl: num(md?.atl?.usd),
        circulating: num(md?.circulating_supply), totalSupply: num(md?.total_supply), maxSupply: num(md?.max_supply),
        change24h: num(md?.price_change_percentage_24h), change7d: num(md?.price_change_percentage_7d), change30d: num(md?.price_change_percentage_30d),
        spark: (md?.sparkline_7d?.price ?? []).filter((n, i) => i % 3 === 0 && Number.isFinite(n)),
      };
    } catch (err) {
      if (err instanceof ProviderError && err.kind === "not_found") return null;
      throw err;
    }
  },

  isKeyed: () => Boolean(process.env.COINGECKO_API_KEY),

  /** Look up a coin by asset-platform id and contract address. Returns null if CoinGecko does not list it. */
  async byContract(platformId: string, address: string): Promise<CoinGeckoContractInfo | null> {
    try {
      const c = await cg<RawCoin>(`/coins/${platformId}/contract/${encodeURIComponent(address)}`, 5 * 60_000);
      const md = c.market_data;
      const discord = (c.links?.chat_url ?? []).find((u) => u.includes("discord"));
      return {
        id: c.id,
        name: c.name,
        symbol: c.symbol,
        imageUrl: str(c.image?.large),
        description: str(c.description?.en),
        homepage: str(c.links?.homepage?.[0]),
        twitter: c.links?.twitter_screen_name ? `https://x.com/${c.links.twitter_screen_name}` : null,
        telegram: c.links?.telegram_channel_identifier ? `https://t.me/${c.links.telegram_channel_identifier}` : null,
        discord: str(discord),
        priceUsd: num(md?.current_price?.usd),
        marketCapUsd: num(md?.market_cap?.usd),
        fdvUsd: num(md?.fully_diluted_valuation?.usd),
        volume24hUsd: num(md?.total_volume?.usd),
        circulatingSupply: num(md?.circulating_supply),
        totalSupply: num(md?.total_supply),
        maxSupply: num(md?.max_supply),
        genesisDate: str(c.genesis_date),
        url: `https://www.coingecko.com/en/coins/${c.id}`,
        observedAt: new Date().toISOString(),
      };
    } catch (err) {
      if (err instanceof ProviderError && err.kind === "not_found") return null;
      throw err;
    }
  },

  /** Coins matching a name or symbol. Used to find a contract when the owner does not have the address to hand. */
  async search(q: string): Promise<Array<{ id: string; name: string; symbol: string; imageUrl: string | null; rank: number | null }>> {
    const raw = await cg<{ coins?: Array<{ id: string; name: string; symbol: string; large?: string; thumb?: string; market_cap_rank?: number | null }> }>(`/search?query=${encodeURIComponent(q)}`, 5 * 60_000);
    return (raw.coins ?? []).map((c) => ({ id: c.id, name: c.name, symbol: c.symbol.toUpperCase(), imageUrl: str(c.large ?? c.thumb), rank: c.market_cap_rank ?? null }));
  },

  /** Contract addresses of one coin per CoinGecko asset platform. Empty for coins with no contract, such as native coins. */
  async platforms(coinId: string): Promise<Record<string, string>> {
    const raw = await cg<{ platforms?: Record<string, string> }>(`/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`, 30 * 60_000);
    return Object.fromEntries(Object.entries(raw.platforms ?? {}).filter(([k, v]) => k && v));
  },

  async global(): Promise<{ totalMarketCapUsd: number | null; volume24hUsd: number | null; btcDominance: number | null; change24h: number | null; observedAt: string }> {
    const raw = await cg<{ data: { total_market_cap?: { usd?: number }; total_volume?: { usd?: number }; market_cap_percentage?: { btc?: number }; market_cap_change_percentage_24h_usd?: number } }>("/global", 5 * 60_000);
    return {
      totalMarketCapUsd: num(raw.data.total_market_cap?.usd),
      volume24hUsd: num(raw.data.total_volume?.usd),
      btcDominance: num(raw.data.market_cap_percentage?.btc),
      change24h: num(raw.data.market_cap_change_percentage_24h_usd),
      observedAt: new Date().toISOString(),
    };
  },
};
