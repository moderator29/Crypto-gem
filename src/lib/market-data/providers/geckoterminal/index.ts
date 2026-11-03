import { cached } from "../../cache";
import { ProviderError } from "../../errors";
import { fetchJson } from "../../http";
import { networkFromGecko } from "../../networks";
import type { Candle, PoolSummary, TokenIdentity } from "../../types";

const PROVIDER = "geckoterminal";
const PUBLIC_BASE = "https://api.geckoterminal.com/api/v2";
const PRO_BASE = "https://pro-api.coingecko.com/api/v3/onchain";
const VERSION_HEADER = { Accept: "application/json;version=20230302" };

function endpoint(): { base: string; headers: Record<string, string> } {
  const key = process.env.GECKOTERMINAL_API_KEY || (process.env.COINGECKO_API_PLAN === "pro" ? process.env.COINGECKO_API_KEY : "");
  if (key) return { base: PRO_BASE, headers: { ...VERSION_HEADER, "x-cg-pro-api-key": key } };
  return { base: PUBLIC_BASE, headers: VERSION_HEADER };
}

/** Public endpoint allows roughly 30 calls per minute, so every call is cached. */
async function gt<T>(path: string, ttlMs: number): Promise<{ data: T; stale: boolean }> {
  const { base, headers } = endpoint();
  const res = await cached(`gt:${path}`, ttlMs, () => fetchJson<T>(`${base}${path}`, { provider: PROVIDER, headers }), { staleMs: 10 * 60_000 });
  return { data: res.value, stale: res.stale };
}

interface RawResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, { data: { id: string; type: string } | null }>;
}
interface RawList {
  data: RawResource[];
  included?: RawResource[];
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

function tokenFrom(res: RawResource | undefined, fallbackNetwork: string): TokenIdentity | null {
  if (!res) return null;
  const a = res.attributes;
  const address = String(a.address ?? "");
  if (!address) return null;
  return {
    networkId: networkFromGecko(fallbackNetwork)?.id ?? fallbackNetwork,
    address,
    name: String(a.name ?? ""),
    symbol: String(a.symbol ?? ""),
    imageUrl: typeof a.image_url === "string" && a.image_url.startsWith("https://") ? a.image_url : null,
    decimals: num(a.decimals),
    coingeckoId: typeof a.coingecko_coin_id === "string" ? a.coingecko_coin_id : null,
  };
}

/** Normalise a GeckoTerminal pool resource (plus included tokens/dex) into PoolSummary. */
export function normalizePools(raw: RawList, observedAt = new Date().toISOString()): PoolSummary[] {
  const included = new Map((raw.included ?? []).map((r) => [`${r.type}:${r.id}`, r]));
  const out: PoolSummary[] = [];
  for (const pool of raw.data ?? []) {
    const a = pool.attributes;
    const rel = pool.relationships ?? {};
    const geckoNet = rel.network?.data?.id ?? pool.id.split("_")[0] ?? "";
    const baseRef = rel.base_token?.data;
    const quoteRef = rel.quote_token?.data;
    const base = tokenFrom(baseRef ? included.get(`token:${baseRef.id}`) : undefined, geckoNet);
    if (!base) continue;
    const quote = tokenFrom(quoteRef ? included.get(`token:${quoteRef.id}`) : undefined, geckoNet);
    const dexId = rel.dex?.data?.id;
    const pc = (a.price_change_percentage ?? {}) as Record<string, unknown>;
    const vol = (a.volume_usd ?? {}) as Record<string, unknown>;
    const tx = (a.transactions ?? {}) as Record<string, { buys?: number; sells?: number } | undefined>;
    out.push({
      id: pool.id,
      networkId: networkFromGecko(geckoNet)?.id ?? geckoNet,
      address: String(a.address ?? ""),
      name: String(a.name ?? ""),
      dex: dexId ?? null,
      createdAt: typeof a.pool_created_at === "string" ? a.pool_created_at : null,
      baseToken: base,
      quoteToken: quote,
      priceUsd: num(a.base_token_price_usd),
      liquidityUsd: num(a.reserve_in_usd),
      fdvUsd: num(a.fdv_usd),
      marketCapUsd: num(a.market_cap_usd),
      volumeUsd: { m5: num(vol.m5), h1: num(vol.h1), h6: num(vol.h6), h24: num(vol.h24) },
      change: { m5: num(pc.m5), h1: num(pc.h1), h6: num(pc.h6), h24: num(pc.h24) },
      txns24h: tx.h24 ? { buys: tx.h24.buys ?? 0, sells: tx.h24.sells ?? 0 } : null,
      txns1h: tx.h1 ? { buys: tx.h1.buys ?? 0, sells: tx.h1.sells ?? 0 } : null,
      source: "geckoterminal",
      observedAt,
    });
  }
  return out;
}

const INCLUDE = "include=base_token,quote_token,dex,network";

export interface PoolResult {
  pools: PoolSummary[];
  stale: boolean;
}

async function poolList(path: string, ttlMs: number): Promise<PoolResult> {
  const { data, stale } = await gt<RawList>(path, ttlMs);
  return { pools: normalizePools(data), stale };
}

export const geckoTerminal = {
  trendingPools: (geckoNetwork?: string, page = 1) =>
    poolList(`${geckoNetwork ? `/networks/${geckoNetwork}` : "/networks"}/trending_pools?${INCLUDE}&page=${page}`, 60_000),

  newPools: (geckoNetwork?: string, page = 1) =>
    poolList(`${geckoNetwork ? `/networks/${geckoNetwork}` : "/networks"}/new_pools?${INCLUDE}&page=${page}`, 60_000),

  topPools: (geckoNetwork: string, page = 1) =>
    poolList(`/networks/${geckoNetwork}/pools?${INCLUDE}&page=${page}&sort=h24_volume_usd_desc`, 120_000),

  /** One call that searches pools across every network by name, symbol or address. */
  searchPools: (query: string, geckoNetwork?: string) =>
    poolList(`/search/pools?query=${encodeURIComponent(query)}${geckoNetwork ? `&network=${geckoNetwork}` : ""}&${INCLUDE}&page=1`, 45_000),

  poolsForToken: (geckoNetwork: string, address: string) =>
    poolList(`/networks/${geckoNetwork}/tokens/${encodeURIComponent(address)}/pools?${INCLUDE}&page=1`, 45_000),

  async token(geckoNetwork: string, address: string) {
    const { data } = await gt<{ data: RawResource }>(`/networks/${geckoNetwork}/tokens/${encodeURIComponent(address)}?include=top_pools`, 60_000);
    const a = data.data.attributes;
    return {
      identity: tokenFrom(data.data, geckoNetwork),
      priceUsd: num(a.price_usd),
      fdvUsd: num(a.fdv_usd),
      marketCapUsd: num(a.market_cap_usd),
      totalSupply: typeof a.total_supply === "string" ? a.total_supply : null,
      volume24hUsd: num((a.volume_usd as Record<string, unknown> | undefined)?.h24),
      liquidityUsd: num(a.total_reserve_in_usd),
      observedAt: new Date().toISOString(),
    };
  },

  async networks(): Promise<Array<{ id: string; name: string }>> {
    const out: Array<{ id: string; name: string }> = [];
    for (let page = 1; page <= 5; page++) {
      const { data } = await gt<{ data: RawResource[] }>(`/networks?page=${page}`, 6 * 3600_000);
      if (!data.data?.length) break;
      for (const n of data.data) out.push({ id: n.id, name: String(n.attributes.name ?? n.id) });
      if (data.data.length < 100) break;
    }
    return out;
  },

  async ohlcv(geckoNetwork: string, pool: string, timeframe: "minute" | "hour" | "day", aggregate: number, limit = 300): Promise<Candle[]> {
    const { data } = await gt<{ data: { attributes: { ohlcv_list: number[][] } } }>(
      `/networks/${geckoNetwork}/pools/${encodeURIComponent(pool)}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}&currency=usd`,
      30_000,
    );
    const list = data.data?.attributes?.ohlcv_list;
    if (!Array.isArray(list)) throw new ProviderError(PROVIDER, "bad_response", "Missing OHLCV list");
    return list
      .map(([time, open, high, low, close, volume]) => ({ time: time as number, open: open as number, high: high as number, low: low as number, close: close as number, volume: (volume as number) ?? 0 }))
      .sort((x, y) => x.time - y.time);
  },
};
