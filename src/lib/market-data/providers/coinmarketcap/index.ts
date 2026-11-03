import { cached } from "../../cache";
import { ProviderError } from "../../errors";
import { fetchJson } from "../../http";

const PROVIDER = "coinmarketcap";
const BASE = "https://pro-api.coinmarketcap.com";

export interface CoinMarketCapInfo {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  logo: string | null;
  website: string | null;
  twitter: string | null;
  telegram: string | null;
  url: string;
  priceUsd: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  rank: number | null;
  observedAt: string;
}

async function cmc<T>(path: string, ttlMs: number): Promise<T> {
  const key = process.env.COINMARKETCAP_API_KEY;
  if (!key) throw new ProviderError(PROVIDER, "not_configured", "COINMARKETCAP_API_KEY is not set");
  const res = await cached(`cmc:${path}`, ttlMs, () => fetchJson<T>(`${BASE}${path}`, { provider: PROVIDER, headers: { "X-CMC_PRO_API_KEY": key } }), { staleMs: 30 * 60_000 });
  return res.value;
}

interface RawInfo {
  data: Record<string, { id: number; name: string; symbol: string; slug: string; logo?: string; urls?: { website?: string[]; twitter?: string[]; chat?: string[] } }[] | { id: number; name: string; symbol: string; slug: string; logo?: string; urls?: { website?: string[]; twitter?: string[]; chat?: string[] } }>;
}
interface RawQuote {
  data: Record<string, { cmc_rank?: number; quote?: { USD?: { price?: number; market_cap?: number; volume_24h?: number } } } | { cmc_rank?: number; quote?: { USD?: { price?: number; market_cap?: number; volume_24h?: number } } }[]>;
}

const first = <T>(v: T | T[] | undefined): T | undefined => (Array.isArray(v) ? v[0] : v);

export const coinmarketcap = {
  isConfigured: () => Boolean(process.env.COINMARKETCAP_API_KEY),

  /** Metadata lookup by contract address. The CMC info endpoint is keyed by address and does not name the network. */
  async byAddress(address: string): Promise<CoinMarketCapInfo | null> {
    try {
      const info = await cmc<RawInfo>(`/v2/cryptocurrency/info?address=${encodeURIComponent(address)}`, 10 * 60_000);
      const entry = first(Object.values(info.data)[0]);
      if (!entry) return null;
      let quote: RawQuote["data"][string] | undefined;
      try {
        quote = first(Object.values((await cmc<RawQuote>(`/v2/cryptocurrency/quotes/latest?id=${entry.id}`, 60_000)).data)[0] as never);
      } catch (err) {
        if (!(err instanceof ProviderError)) throw err;
      }
      const q = (quote as { cmc_rank?: number; quote?: { USD?: { price?: number; market_cap?: number; volume_24h?: number } } } | undefined);
      const tg = entry.urls?.chat?.find((u) => u.includes("t.me") || u.includes("telegram"));
      return {
        id: entry.id,
        name: entry.name,
        symbol: entry.symbol,
        slug: entry.slug,
        logo: entry.logo?.startsWith("https://") ? entry.logo : null,
        website: entry.urls?.website?.[0] ?? null,
        twitter: entry.urls?.twitter?.[0] ?? null,
        telegram: tg ?? null,
        url: `https://coinmarketcap.com/currencies/${entry.slug}/`,
        priceUsd: q?.quote?.USD?.price ?? null,
        marketCapUsd: q?.quote?.USD?.market_cap ?? null,
        volume24hUsd: q?.quote?.USD?.volume_24h ?? null,
        rank: q?.cmc_rank ?? null,
        observedAt: new Date().toISOString(),
      };
    } catch (err) {
      if (err instanceof ProviderError && (err.kind === "not_found" || err.status === 400)) return null;
      throw err;
    }
  },
};
