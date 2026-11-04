import { cached } from "../../cache";
import { ProviderError } from "../../errors";
import { fetchJson } from "../../http";
import { numOrNull, strOrNull, type ExternalTokenInfo } from "../external";

const PROVIDER = "dextools";

/** Our network id to the DexTools chain slug. */
const CHAIN: Record<string, string> = { ethereum: "ether", solana: "solana", bsc: "bsc", base: "base", arbitrum: "arbitrum", optimism: "optimism", polygon: "polygon", avalanche: "avalanche", fantom: "fantom", linea: "linea", zksync: "zksync", scroll: "scroll", mantle: "mantle", blast: "blast", cronos: "cronos", sui: "sui", ton: "ton", tron: "tron", sonic: "sonic" };

interface Wrapped<T> { data?: T }

export const dextools = {
  isConfigured: () => Boolean(process.env.DEXTOOLS_API_KEY),

  /** Token info and links from DexTools. Needs DEXTOOLS_API_KEY (and DEXTOOLS_PLAN: trial, standard, advanced or pro). Returns null when it has no record. */
  async token(networkId: string, address: string): Promise<ExternalTokenInfo | null> {
    const key = process.env.DEXTOOLS_API_KEY;
    if (!key) throw new ProviderError(PROVIDER, "not_configured", "DEXTOOLS_API_KEY is not set");
    const chain = CHAIN[networkId];
    if (!chain) return null;
    const base = `https://public-api.dextools.io/${process.env.DEXTOOLS_PLAN || "trial"}/v2/token/${chain}/${encodeURIComponent(address)}`;
    const headers = { "X-API-KEY": key };
    const call = <T>(path: string) => cached(`dt:${path}`, 5 * 60_000, () => fetchJson<Wrapped<T>>(`${base}${path}`, { provider: PROVIDER, headers, timeoutMs: 8000, retries: 1 }), { staleMs: 30 * 60_000 }).then((r) => r.value.data);
    try {
      const [meta, info, price] = await Promise.all([
        call<{ name?: string; symbol?: string; logo?: string; description?: string; creationTime?: string; socialInfo?: { website?: string; twitter?: string; telegram?: string; discord?: string } }>(""),
        call<{ mcap?: number; fdv?: number; holders?: number }>("/info").catch(() => undefined),
        call<{ price?: number; volume24h?: number; liquidity?: number }>("/price").catch(() => undefined),
      ]);
      if (!meta) return null;
      const s = meta.socialInfo ?? {};
      return {
        provider: "dextools",
        name: strOrNull(meta.name),
        symbol: strOrNull(meta.symbol),
        logoUrl: strOrNull(meta.logo),
        headerUrl: null,
        description: strOrNull(meta.description),
        website: strOrNull(s.website),
        twitter: strOrNull(s.twitter),
        telegram: strOrNull(s.telegram),
        discord: strOrNull(s.discord),
        priceUsd: numOrNull(price?.price),
        marketCapUsd: numOrNull(info?.mcap),
        fdvUsd: numOrNull(info?.fdv),
        liquidityUsd: numOrNull(price?.liquidity),
        volume24hUsd: numOrNull(price?.volume24h),
        launchDate: strOrNull(meta.creationTime),
      };
    } catch (err) {
      if (err instanceof ProviderError && err.kind === "not_found") return null;
      throw err;
    }
  },
};
