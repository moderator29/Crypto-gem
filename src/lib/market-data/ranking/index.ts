import type { PoolSummary } from "../types";

/** Organic ranking inputs and weights are public so the score can be explained on the site. */
export const ORGANIC_WEIGHTS = {
  momentum: 0.2,
  volume: 0.25,
  liquidity: 0.2,
  activity: 0.2,
  balance: 0.1,
  freshness: 0.05,
} as const;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const logScale = (v: number, lo: number, hi: number) => clamp01((Math.log10(Math.max(v, 1)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)));

export interface Scored {
  pool: PoolSummary;
  score: number;
  breakdown: Record<keyof typeof ORGANIC_WEIGHTS, number>;
}

/**
 * Organic score in [0, 100]. Paid placements never feed into this function.
 * Price change is deliberately capped so a thin pool pumping +5000% cannot
 * outrank a liquid, active market.
 */
export function organicScore(pool: PoolSummary): Scored {
  const change = pool.change.h24 ?? 0;
  const momentum = clamp01((Math.min(Math.max(change, -50), 200) + 50) / 250);
  const volume = logScale(pool.volumeUsd.h24 ?? 0, 1_000, 50_000_000);
  const liquidity = logScale(pool.liquidityUsd ?? 0, 5_000, 20_000_000);
  const txns = (pool.txns24h?.buys ?? 0) + (pool.txns24h?.sells ?? 0);
  const activity = logScale(txns, 10, 50_000);
  const buys = pool.txns24h?.buys ?? 0;
  const sells = pool.txns24h?.sells ?? 0;
  const balance = txns > 0 ? 1 - Math.abs(buys - sells) / txns : 0;
  const ageH = pool.createdAt ? (Date.now() - Date.parse(pool.createdAt)) / 3_600_000 : null;
  const freshness = ageH === null ? 0 : clamp01(1 - ageH / 168);
  const breakdown = { momentum, volume, liquidity, activity, balance, freshness };
  const score = 100 * (Object.keys(ORGANIC_WEIGHTS) as Array<keyof typeof ORGANIC_WEIGHTS>).reduce((s, k) => s + ORGANIC_WEIGHTS[k] * breakdown[k], 0);
  return { pool, score, breakdown };
}

/** Collapse multiple pools of one token into its deepest pool. */
export function dedupeByToken(pools: PoolSummary[]): PoolSummary[] {
  const best = new Map<string, PoolSummary>();
  for (const p of pools) {
    const key = `${p.networkId}:${p.baseToken.address}`;
    const cur = best.get(key);
    if (!cur || (p.liquidityUsd ?? 0) > (cur.liquidityUsd ?? 0)) best.set(key, p);
  }
  return [...best.values()];
}

export interface HeatingUp {
  pool: PoolSummary;
  reason: string;
  ratio: number;
}

/**
 * Heating up: 1h volume running well above the pool's own 24h hourly average.
 * Requires meaningful liquidity and the reason is stated with real numbers.
 */
export function heatingUp(pools: PoolSummary[], minLiquidityUsd = 10_000): HeatingUp[] {
  const out: HeatingUp[] = [];
  for (const p of pools) {
    const h1 = p.volumeUsd.h1;
    const h24 = p.volumeUsd.h24;
    if (h1 === null || h24 === null || h24 <= 0 || (p.liquidityUsd ?? 0) < minLiquidityUsd) continue;
    const hourlyAvg = h24 / 24;
    const ratio = h1 / hourlyAvg;
    if (ratio >= 2.5) out.push({ pool: p, ratio, reason: `Last hour volume is ${ratio.toFixed(1)}x its 24h hourly average` });
  }
  return out.sort((a, b) => b.ratio - a.ratio);
}

export function rankOrganic(pools: PoolSummary[], limit = 20): Scored[] {
  return dedupeByToken(pools).map(organicScore).sort((a, b) => b.score - a.score).slice(0, limit);
}
