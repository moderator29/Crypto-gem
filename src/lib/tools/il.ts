import { type Calc, usable } from "./common";

export interface IlResult { ratio: number; ilPct: number; holdValue: number | null; poolValue: number | null; lostValue: number | null }
export interface IlPoint { ratio: number; ilPct: number }

/** Impermanent loss of a 50/50 constant-product pool as a negative percent, for a price ratio k (new price over old price). */
export function ilForRatio(k: number): number {
  if (!(k > 0) || !Number.isFinite(k)) return NaN;
  return ((2 * Math.sqrt(k)) / (1 + k) - 1) * 100;
}

/** Impermanent loss when one asset moves by `changePct` against the other. Optional deposit shows the money difference versus holding. */
export function impermanentLoss(changePct: number | null, deposit: number | null): Calc<IlResult> {
  const errors: string[] = [];
  if (!usable(changePct)) errors.push("Enter the price change as a percentage.");
  else if (changePct <= -100) errors.push("A price cannot fall by 100% or more in this model.");
  if (deposit !== null && (!usable(deposit) || deposit <= 0)) errors.push("Deposit must be greater than zero.");
  if (errors.length || !usable(changePct)) return { ok: false, errors };
  const ratio = 1 + changePct / 100;
  const ilPct = ilForRatio(ratio);
  if (!Number.isFinite(ilPct)) return { ok: false, errors: ["These numbers are too large to calculate."] };
  if (deposit === null) return { ok: true, value: { ratio, ilPct, holdValue: null, poolValue: null, lostValue: null } };
  const holdValue = (deposit * (1 + ratio)) / 2;
  const poolValue = deposit * Math.sqrt(ratio);
  return { ok: true, value: { ratio, ilPct, holdValue, poolValue, lostValue: holdValue - poolValue } };
}

/** Points for the loss curve on a log scale of price ratio from 1/maxRatio to maxRatio. */
export function ilCurve(maxRatio = 10, steps = 48): IlPoint[] {
  const lo = Math.log(1 / maxRatio);
  const hi = Math.log(maxRatio);
  return Array.from({ length: steps + 1 }, (_, k) => {
    const ratio = Math.exp(lo + ((hi - lo) * k) / steps);
    return { ratio, ilPct: ilForRatio(ratio) };
  });
}
