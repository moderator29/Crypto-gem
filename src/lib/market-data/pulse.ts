import { getNetwork } from "./networks";
import type { PoolSummary } from "./types";

export interface ChainPulse {
  networkId: string;
  name: string;
  pools: number;
  newPools: number;
  volume24hUsd: number;
  liquidityUsd: number;
  medianChange24h: number | null;
  buySellRatio: number | null;
}

const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/**
 * Per-chain aggregates over the pools we sampled (trending plus newly created).
 * Median change resists a single pumping pool. Pools under the liquidity floor
 * are excluded from price statistics so dust pools cannot colour a whole chain.
 */
export function chainPulse(trending: PoolSummary[], fresh: PoolSummary[], minLiquidityUsd = 5_000, now = Date.now()): ChainPulse[] {
  const all = new Map<string, PoolSummary>();
  for (const p of [...trending, ...fresh]) all.set(p.id, p);
  const groups = new Map<string, PoolSummary[]>();
  for (const p of all.values()) groups.set(p.networkId, [...(groups.get(p.networkId) ?? []), p]);

  const out: ChainPulse[] = [];
  for (const [networkId, pools] of groups) {
    const liquid = pools.filter((p) => (p.liquidityUsd ?? 0) >= minLiquidityUsd);
    const buys = liquid.reduce((s, p) => s + (p.txns24h?.buys ?? 0), 0);
    const sells = liquid.reduce((s, p) => s + (p.txns24h?.sells ?? 0), 0);
    out.push({
      networkId,
      name: getNetwork(networkId)?.name ?? networkId,
      pools: pools.length,
      newPools: pools.filter((p) => p.createdAt && now - Date.parse(p.createdAt) < 24 * 3_600_000).length,
      volume24hUsd: pools.reduce((s, p) => s + (p.volumeUsd.h24 ?? 0), 0),
      liquidityUsd: pools.reduce((s, p) => s + (p.liquidityUsd ?? 0), 0),
      medianChange24h: median(liquid.map((p) => p.change.h24).filter((v): v is number => v !== null)),
      buySellRatio: sells > 0 ? buys / sells : null,
    });
  }
  return out.sort((a, b) => b.volume24hUsd - a.volume24hUsd);
}

/** Maps a median change to a heat bucket from -3 (deep red) to +3 (deep green). Null is neutral. */
export function heatBucket(change: number | null): -3 | -2 | -1 | 0 | 1 | 2 | 3 {
  if (change === null) return 0;
  const sign = change < 0 ? -1 : 1;
  const a = Math.abs(change);
  const level = a >= 25 ? 3 : a >= 8 ? 2 : a >= 1.5 ? 1 : 0;
  return (sign * level) as -3 | -2 | -1 | 0 | 1 | 2 | 3;
}
