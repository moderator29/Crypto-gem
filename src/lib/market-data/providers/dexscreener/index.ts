import { cached } from "../../cache";
import { fetchJson } from "../../http";
import { getNetwork } from "../../networks";
import type { PoolSummary } from "../../types";
import { numOrNull, strOrNull, type ExternalTokenInfo } from "../external";

const PROVIDER = "dexscreener";
const BASE = "https://api.dexscreener.com";

/** DexScreener chain ids that differ from our network ids. */
const CHAIN_ALIAS: Record<string, string> = { gnosischain: "gnosis", avalanche: "avalanche", polygon: "polygon", bsc: "bsc" };

export const networkFromDexScreener = (chainId: string): string | null => {
  const id = CHAIN_ALIAS[chainId] ?? chainId;
  return getNetwork(id) ? id : null;
};

interface RawPair {
  chainId: string;
  dexId?: string;
  url?: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd?: string;
  txns?: { h24?: { buys?: number; sells?: number }; h1?: { buys?: number; sells?: number } };
  volume?: { h24?: number; h6?: number; h1?: number; m5?: number };
  priceChange?: { h24?: number; h6?: number; h1?: number; m5?: number };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: { imageUrl?: string; header?: string; websites?: Array<{ label?: string; url: string }>; socials?: Array<{ type: string; url: string }> };
}

export interface BannerProfile {
  chainId: string;
  networkId: string;
  address: string;
  name: string;
  symbol: string;
  header: string;
  icon: string | null;
  url: string;
}

const get = <T>(path: string, ttlMs: number) => cached(`ds:${path}`, ttlMs, () => fetchJson<T>(`${BASE}${path}`, { provider: PROVIDER, timeoutMs: 8000, retries: 1 }), { staleMs: 30 * 60_000 }).then((r) => r.value);

export const dexscreener = {
  /** Every pair for a token address, across all chains. */
  async tokenPairs(address: string): Promise<RawPair[]> {
    const j = await get<RawPair[] | { pairs?: RawPair[] }>(`/latest/dex/tokens/${encodeURIComponent(address)}`, 60_000);
    return Array.isArray(j) ? j : (j.pairs ?? []);
  },

  async search(q: string): Promise<RawPair[]> {
    const j = await get<{ pairs?: RawPair[] }>(`/latest/dex/search?q=${encodeURIComponent(q)}`, 60_000);
    return j.pairs ?? [];
  },

  /** Merges the pairs of one token on one network into the shape the detector consumes. */
  toInfo(pairs: RawPair[], address: string, networkId: string): ExternalTokenInfo | null {
    const mine = pairs
      .filter((p) => networkFromDexScreener(p.chainId) === networkId)
      .filter((p) => p.baseToken.address.toLowerCase() === address.toLowerCase() || p.quoteToken.address.toLowerCase() === address.toLowerCase())
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
    const top = mine[0];
    if (!top) return null;
    const tok = top.baseToken.address.toLowerCase() === address.toLowerCase() ? top.baseToken : top.quoteToken;
    const withInfo = mine.find((p) => p.info) ?? top;
    const social = (type: string) => strOrNull(withInfo.info?.socials?.find((s) => s.type === type)?.url);
    const oldest = mine.map((p) => p.pairCreatedAt).filter((n): n is number => typeof n === "number").sort((a, b) => a - b)[0];
    return {
      provider: "dexscreener",
      name: strOrNull(tok.name),
      symbol: strOrNull(tok.symbol),
      logoUrl: strOrNull(withInfo.info?.imageUrl),
      headerUrl: strOrNull(withInfo.info?.header),
      description: null,
      website: strOrNull(withInfo.info?.websites?.[0]?.url),
      twitter: social("twitter"),
      telegram: social("telegram"),
      discord: social("discord"),
      priceUsd: numOrNull(top.priceUsd),
      marketCapUsd: numOrNull(top.marketCap),
      fdvUsd: numOrNull(top.fdv),
      liquidityUsd: numOrNull(top.liquidity?.usd),
      volume24hUsd: mine.length ? mine.reduce((s, p) => s + (p.volume?.h24 ?? 0), 0) : null,
      launchDate: oldest ? new Date(oldest).toISOString() : null,
    };
  },

  /** Pairs mapped to the app's pool shape, used when GeckoTerminal has no pools for a token. */
  toPools(pairs: RawPair[], address: string, networkId: string): PoolSummary[] {
    return pairs
      .filter((p) => networkFromDexScreener(p.chainId) === networkId)
      .filter((p) => address === "" || p.baseToken.address.toLowerCase() === address.toLowerCase() || p.quoteToken.address.toLowerCase() === address.toLowerCase())
      .map((p) => ({
        id: `ds:${p.chainId}:${p.pairAddress}`,
        networkId,
        address: p.pairAddress,
        name: `${p.baseToken.symbol} / ${p.quoteToken.symbol}`,
        dex: p.dexId ?? null,
        createdAt: p.pairCreatedAt ? new Date(p.pairCreatedAt).toISOString() : null,
        baseToken: { networkId, address: p.baseToken.address, name: p.baseToken.name, symbol: p.baseToken.symbol, imageUrl: strOrNull(p.info?.imageUrl), decimals: null, coingeckoId: null },
        quoteToken: { networkId, address: p.quoteToken.address, name: p.quoteToken.name, symbol: p.quoteToken.symbol, imageUrl: null, decimals: null, coingeckoId: null },
        priceUsd: numOrNull(p.priceUsd),
        liquidityUsd: numOrNull(p.liquidity?.usd),
        fdvUsd: numOrNull(p.fdv),
        marketCapUsd: numOrNull(p.marketCap),
        volumeUsd: { m5: numOrNull(p.volume?.m5), h1: numOrNull(p.volume?.h1), h6: numOrNull(p.volume?.h6), h24: numOrNull(p.volume?.h24) },
        change: { m5: numOrNull(p.priceChange?.m5), h1: numOrNull(p.priceChange?.h1), h6: numOrNull(p.priceChange?.h6), h24: numOrNull(p.priceChange?.h24) },
        txns24h: p.txns?.h24 ? { buys: p.txns.h24.buys ?? 0, sells: p.txns.h24.sells ?? 0 } : null,
        txns1h: p.txns?.h1 ? { buys: p.txns.h1.buys ?? 0, sells: p.txns.h1.sells ?? 0 } : null,
        source: "dexscreener",
        observedAt: new Date().toISOString(),
      }));
  },

  /**
   * Tokens that have a custom header banner on DexScreener, taken from its boosted and latest profile lists.
   * Names and symbols come from the pair data. Returns an empty list if DexScreener is unreachable.
   */
  async bannerProfiles(limit = 3): Promise<BannerProfile[]> {
    const [boosts, latest] = await Promise.allSettled([
      get<Array<{ chainId: string; tokenAddress: string; header?: string; icon?: string; url?: string }>>("/token-boosts/top/v1", 10 * 60_000),
      get<Array<{ chainId: string; tokenAddress: string; header?: string; icon?: string; url?: string }>>("/token-profiles/latest/v1", 10 * 60_000),
    ]);
    const pool = [...(boosts.status === "fulfilled" ? boosts.value : []), ...(latest.status === "fulfilled" ? latest.value : [])]
      .filter((p) => p.header && networkFromDexScreener(p.chainId))
      .filter((p, i, a) => a.findIndex((x) => x.tokenAddress === p.tokenAddress) === i)
      .slice(0, limit * 3);
    const out: BannerProfile[] = [];
    const settled = await Promise.allSettled(pool.map(async (p) => ({ p, pairs: await dexscreener.tokenPairs(p.tokenAddress) })));
    for (const r of settled) {
      if (r.status !== "fulfilled" || out.length >= limit) continue;
      const { p, pairs } = r.value;
      const networkId = networkFromDexScreener(p.chainId);
      if (!networkId) continue;
      const info = dexscreener.toInfo(pairs, p.tokenAddress, networkId);
      if (!info?.name || !info.symbol || (info.liquidityUsd ?? 0) < 5_000) continue;
      out.push({ chainId: p.chainId, networkId, address: p.tokenAddress, name: info.name, symbol: info.symbol, header: p.header as string, icon: info.logoUrl ?? strOrNull(p.icon), url: p.url ?? "" });
    }
    return out;
  },
};
