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

export const coingecko = {
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
