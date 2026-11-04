import { type Calc, usable } from "./common";

export interface PnlInput { entry: number | null; exit: number | null; amount: number | null; fees: number | null }
export interface PnlResult { cost: number; proceeds: number; fees: number; pnl: number; pct: number; breakEven: number }

/** Profit and loss for a spot trade. Fees are the total paid in USD across both sides. Percent is relative to the cost paid. */
export function profitAndLoss(i: PnlInput): Calc<PnlResult> {
  const errors: string[] = [];
  if (!usable(i.entry) || i.entry <= 0) errors.push("Entry price must be greater than zero.");
  if (!usable(i.exit) || i.exit < 0) errors.push("Exit price must be zero or more.");
  if (!usable(i.amount) || i.amount <= 0) errors.push("Amount must be greater than zero.");
  const fees = i.fees === null ? 0 : i.fees;
  if (!usable(fees) || fees < 0) errors.push("Fees must be zero or more.");
  if (errors.length || !usable(i.entry) || !usable(i.exit) || !usable(i.amount)) return { ok: false, errors };
  const cost = i.entry * i.amount;
  const proceeds = i.exit * i.amount;
  if (!Number.isFinite(cost) || !Number.isFinite(proceeds)) return { ok: false, errors: ["These numbers are too large to calculate."] };
  const pnl = proceeds - cost - fees;
  return { ok: true, value: { cost, proceeds, fees, pnl, pct: (pnl / cost) * 100, breakEven: (cost + fees) / i.amount } };
}
