import { type Calc, parseList, usable } from "./common";

export const MAX_PERIODS = 520;

export interface DcaRow { period: number; price: number; spent: number; units: number; totalUnits: number; totalSpent: number; avgCost: number }
export interface DcaResult {
  rows: DcaRow[];
  totalSpent: number;
  totalUnits: number;
  avgCost: number;
  lastPrice: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
  lumpUnits: number;
  lumpValue: number;
}

export type DcaInput =
  | { mode: "linear"; amount: number | null; count: number | null; start: number | null; end: number | null }
  | { mode: "list"; amount: number | null; prices: string };

/** Straight-line price path from start to end across n periods, inclusive of both ends. */
export function linearPath(start: number, end: number, n: number): number[] {
  if (n <= 1) return [start];
  return Array.from({ length: n }, (_, k) => start + ((end - start) * k) / (n - 1));
}

/** Dollar-cost averaging over a price path the person supplied. Compared with putting everything in at the first price. */
export function dca(i: DcaInput): Calc<DcaResult> {
  const errors: string[] = [];
  if (!usable(i.amount) || i.amount <= 0) errors.push("Amount per period must be greater than zero.");
  let prices: number[] = [];
  if (i.mode === "linear") {
    if (!usable(i.count) || !Number.isInteger(i.count) || i.count < 1 || i.count > MAX_PERIODS) errors.push(`Number of buys must be a whole number from 1 to ${MAX_PERIODS}.`);
    if (!usable(i.start) || i.start <= 0) errors.push("Start price must be greater than zero.");
    if (!usable(i.end) || i.end <= 0) errors.push("End price must be greater than zero.");
    if (!errors.length && usable(i.count) && usable(i.start) && usable(i.end)) prices = linearPath(i.start, i.end, i.count);
  } else {
    const list = parseList(i.prices);
    if (list === null) errors.push("Prices must be numbers separated by commas, spaces or new lines.");
    else if (list.length === 0) errors.push("Enter at least one price.");
    else if (list.length > MAX_PERIODS) errors.push(`Use at most ${MAX_PERIODS} prices.`);
    else if (list.some((p) => !usable(p) || p <= 0)) errors.push("Every price must be greater than zero.");
    else prices = list;
  }
  if (errors.length || !usable(i.amount)) return { ok: false, errors };
  const amt = i.amount;
  let totalUnits = 0;
  let totalSpent = 0;
  const rows: DcaRow[] = prices.map((price, k) => {
    const units = amt / price;
    totalUnits += units;
    totalSpent += amt;
    return { period: k + 1, price, spent: amt, units, totalUnits, totalSpent, avgCost: totalSpent / totalUnits };
  });
  if (!Number.isFinite(totalUnits) || !Number.isFinite(totalSpent)) return { ok: false, errors: ["These numbers are too large to calculate."] };
  const lastPrice = prices[prices.length - 1] as number;
  const currentValue = totalUnits * lastPrice;
  const lumpUnits = totalSpent / (prices[0] as number);
  return {
    ok: true,
    value: { rows, totalSpent, totalUnits, avgCost: totalSpent / totalUnits, lastPrice, currentValue, pnl: currentValue - totalSpent, pnlPct: ((currentValue - totalSpent) / totalSpent) * 100, lumpUnits, lumpValue: lumpUnits * lastPrice },
  };
}
