import { cached } from "../../cache";
import { ProviderError } from "../../errors";
import { fetchJson } from "../../http";
import { numOrNull, strOrNull, type ExternalTokenInfo } from "../external";

const PROVIDER = "birdeye";

interface Overview {
  data?: {
    name?: string;
    symbol?: string;
    logoURI?: string;
    price?: number;
    marketCap?: number;
    fdv?: number;
    liquidity?: number;
    v24hUSD?: number;
    extensions?: { website?: string; twitter?: string; telegram?: string; discord?: string; description?: string };
  };
}

export const birdeye = {
  isConfigured: () => Boolean(process.env.BIRDEYE_API_KEY),

  /** Solana token overview from Birdeye. Needs BIRDEYE_API_KEY. */
  async token(address: string): Promise<ExternalTokenInfo | null> {
    const key = process.env.BIRDEYE_API_KEY;
    if (!key) throw new ProviderError(PROVIDER, "not_configured", "BIRDEYE_API_KEY is not set");
    const url = `https://public-api.birdeye.so/defi/token_overview?address=${encodeURIComponent(address)}`;
    const { value } = await cached(`be:${address}`, 5 * 60_000, () => fetchJson<Overview>(url, { provider: PROVIDER, headers: { "X-API-KEY": key, "x-chain": "solana" }, timeoutMs: 8000, retries: 1 }), { staleMs: 30 * 60_000 });
    const d = value.data;
    if (!d || !d.symbol) return null;
    return {
      provider: "birdeye",
      name: strOrNull(d.name),
      symbol: strOrNull(d.symbol),
      logoUrl: strOrNull(d.logoURI),
      headerUrl: null,
      description: strOrNull(d.extensions?.description),
      website: strOrNull(d.extensions?.website),
      twitter: strOrNull(d.extensions?.twitter),
      telegram: strOrNull(d.extensions?.telegram),
      discord: strOrNull(d.extensions?.discord),
      priceUsd: numOrNull(d.price),
      marketCapUsd: numOrNull(d.marketCap),
      fdvUsd: numOrNull(d.fdv),
      liquidityUsd: numOrNull(d.liquidity),
      volume24hUsd: numOrNull(d.v24hUSD),
      launchDate: null,
    };
  },
};
