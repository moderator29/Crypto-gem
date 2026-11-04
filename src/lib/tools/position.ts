import { type Calc, usable } from "./common";

export interface PositionInput { account: number | null; riskPct: number | null; entry: number | null; stop: number | null; target: number | null }
export interface PositionResult {
  side: "long" | "short";
  riskAmount: number;
  size: number;
  positionValue: number;
  leverage: number;
  stopDistancePct: number;
  rewardRisk: number | null;
  rewardAmount: number | null;
}

/** Size a position so that being stopped out loses exactly the chosen share of the account. Target is optional. */
export function positionSize(i: PositionInput): Calc<PositionResult> {
  const errors: string[] = [];
  if (!usable(i.account) || i.account <= 0) errors.push("Account size must be greater than zero.");
  if (!usable(i.riskPct) || i.riskPct <= 0 || i.riskPct > 100) errors.push("Risk must be above 0% and at most 100%.");
  if (!usable(i.entry) || i.entry <= 0) errors.push("Entry price must be greater than zero.");
  if (!usable(i.stop) || i.stop <= 0) errors.push("Stop price must be greater than zero.");
  if (usable(i.entry) && usable(i.stop) && i.entry > 0 && i.stop > 0 && i.entry === i.stop) errors.push("Stop must differ from entry.");
  if (errors.length || !usable(i.account) || !usable(i.riskPct) || !usable(i.entry) || !usable(i.stop)) return { ok: false, errors };
  const side = i.stop < i.entry ? "long" : "short";
  if (i.target !== null) {
    if (!usable(i.target) || i.target <= 0) errors.push("Target must be greater than zero.");
    else if (side === "long" && i.target <= i.entry) errors.push("For a long, the target must be above entry.");
    else if (side === "short" && i.target >= i.entry) errors.push("For a short, the target must be below entry.");
  }
  if (errors.length) return { ok: false, errors };
  const riskAmount = (i.account * i.riskPct) / 100;
  const perUnit = Math.abs(i.entry - i.stop);
  const size = riskAmount / perUnit;
  const positionValue = size * i.entry;
  if (!Number.isFinite(size) || !Number.isFinite(positionValue)) return { ok: false, errors: ["These numbers are too large to calculate."] };
  const reward = i.target === null ? null : Math.abs(i.target - i.entry);
  return {
    ok: true,
    value: {
      side,
      riskAmount,
      size,
      positionValue,
      leverage: positionValue / i.account,
      stopDistancePct: (perUnit / i.entry) * 100,
      rewardRisk: reward === null ? null : reward / perUnit,
      rewardAmount: reward === null ? null : reward * size,
    },
  };
}
