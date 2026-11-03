import type { PoolSummary, RiskSignal } from "@/lib/market-data/types";

/**
 * Market-data risk signals. These are observations derived from pool data,
 * not a security audit: they cannot see contract code, ownership or locks.
 */
export function marketRiskSignals(pools: PoolSummary[], now = new Date()): RiskSignal[] {
  const at = now.toISOString();
  const out: RiskSignal[] = [];
  if (pools.length === 0) return out;
  const liq = pools.reduce((s, p) => s + (p.liquidityUsd ?? 0), 0);
  const top = [...pools].sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0))[0]!;
  if (liq < 10_000) out.push({ code: "thin_liquidity", level: "high", message: `Total pool liquidity is only about $${Math.round(liq).toLocaleString("en-US")}. Small trades can move the price sharply.`, source: "derived", observedAt: at });
  else if (liq < 50_000) out.push({ code: "low_liquidity", level: "medium", message: "Liquidity is low. Expect noticeable slippage on larger trades.", source: "derived", observedAt: at });
  if (top.createdAt) {
    const ageH = (now.getTime() - Date.parse(top.createdAt)) / 3_600_000;
    if (ageH < 24) out.push({ code: "new_pool", level: "medium", message: "The main pool was created less than 24 hours ago. New pools carry higher risk.", source: "derived", observedAt: at });
  }
  const buys = top.txns24h?.buys ?? 0;
  const sells = top.txns24h?.sells ?? 0;
  if (buys + sells >= 50 && sells === 0) out.push({ code: "no_sells", level: "high", message: "Many buys but zero sells in 24h. This pattern can indicate a sell restriction. Verify before trading.", source: "derived", observedAt: at });
  if (top.marketCapUsd !== null && top.fdvUsd !== null && top.marketCapUsd > 0 && top.fdvUsd / top.marketCapUsd > 3) out.push({ code: "fdv_gap", level: "low", message: "FDV is more than 3x market cap, so much of the supply is not yet circulating.", source: "derived", observedAt: at });
  return out;
}
