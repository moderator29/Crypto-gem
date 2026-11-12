import { type Calc, usable } from "./common";

export interface CostInput { size: number | null; feePct: number | null; impactPct: number | null; networkUsd: number | null }
export interface CostResult {
  feeUsd: number;
  impactUsd: number;
  networkUsd: number;
  totalUsd: number;
  totalPct: number;
  netValue: number;
  breakEvenPct: number | null;
}

/**
 * Cost of one swap. The pool fee is taken from the trade size, price impact applies to what is left after the fee,
 * and the network fee is a flat dollar amount. The break-even move is the rise needed to earn back the total cost.
 */
export function tradeCost(i: CostInput): Calc<CostResult> {
  const errors: string[] = [];
  if (!usable(i.size) || i.size <= 0) errors.push("Trade size must be greater than zero.");
  if (!usable(i.feePct) || i.feePct < 0 || i.feePct >= 100) errors.push("Pool fee must be at least 0% and below 100%.");
  if (!usable(i.impactPct) || i.impactPct < 0 || i.impactPct >= 100) errors.push("Price impact must be at least 0% and below 100%.");
  if (i.networkUsd !== null && (!usable(i.networkUsd) || i.networkUsd < 0)) errors.push("Network fee cannot be negative.");
  if (errors.length || !usable(i.size) || !usable(i.feePct) || !usable(i.impactPct)) return { ok: false, errors };
  const network = i.networkUsd ?? 0;
  const feeUsd = (i.size * i.feePct) / 100;
  const impactUsd = ((i.size - feeUsd) * i.impactPct) / 100;
  const totalUsd = feeUsd + impactUsd + network;
  if (!Number.isFinite(totalUsd)) return { ok: false, errors: ["These numbers are too large to calculate."] };
  const netValue = i.size - totalUsd;
  return { ok: true, value: { feeUsd, impactUsd, networkUsd: network, totalUsd, totalPct: (totalUsd / i.size) * 100, netValue, breakEvenPct: netValue > 0 ? (totalUsd / netValue) * 100 : null } };
}
