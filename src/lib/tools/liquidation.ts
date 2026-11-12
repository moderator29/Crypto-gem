import { type Calc, usable } from "./common";

export type Side = "long" | "short";

export interface LiquidationInput { side: string | null; entry: number | null; leverage: number | null; mmrPct: number | null; margin: number | null }
export interface Rung { price: number; movePct: number; kind: "entry" | "liq" | "step" }
export interface LiquidationResult {
  side: Side;
  liqPrice: number;
  distancePct: number;
  initialMarginPct: number;
  notional: number | null;
  quantity: number | null;
  marginLost: number | null;
  ladder: Rung[];
}

const NICE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100];

/** Liquidation price for an isolated linear position. Maintenance margin is a share of the position value at the current price. Fees and funding are ignored. */
export function liquidationPrice(side: Side, entry: number, leverage: number, mmrPct: number): number {
  const m = mmrPct / 100;
  return side === "long" ? (entry * (1 - 1 / leverage)) / (1 - m) : (entry * (1 + 1 / leverage)) / (1 + m);
}

/** Price levels from favourable to adverse, with the entry and the liquidation price marked. Sorted from highest price to lowest. */
export function priceLadder(side: Side, entry: number, liq: number): Rung[] {
  const dist = (Math.abs(liq - entry) / entry) * 100;
  const step = NICE_STEPS.find((s) => dist / s <= 5) ?? 100;
  const dir = side === "long" ? -1 : 1;
  const at = (movePct: number): Rung => ({ price: entry * (1 + movePct / 100), movePct, kind: "step" });
  const rungs: Rung[] = [];
  for (let k = 1; k * step < dist - step * 0.35; k++) rungs.push(at(dir * k * step));
  for (let k = 1; k <= 2; k++) if (-dir * k * step > -100) rungs.push(at(-dir * k * step));
  rungs.push({ price: entry, movePct: 0, kind: "entry" });
  rungs.push({ price: liq, movePct: ((liq - entry) / entry) * 100, kind: "liq" });
  return rungs.sort((a, b) => b.price - a.price);
}

/** Work out where a leveraged position would be liquidated and how far price has to move to get there. */
export function liquidation(i: LiquidationInput): Calc<LiquidationResult> {
  const errors: string[] = [];
  if (i.side !== "long" && i.side !== "short") errors.push("Choose long or short.");
  if (!usable(i.entry) || i.entry <= 0) errors.push("Entry price must be greater than zero.");
  if (!usable(i.leverage) || i.leverage < 1 || i.leverage > 1000) errors.push("Leverage must be between 1x and 1000x.");
  if (!usable(i.mmrPct) || i.mmrPct < 0 || i.mmrPct >= 50) errors.push("Maintenance margin must be at least 0% and below 50%.");
  if (i.margin !== null && (!usable(i.margin) || i.margin <= 0)) errors.push("Margin must be greater than zero.");
  if (errors.length || (i.side !== "long" && i.side !== "short") || !usable(i.entry) || !usable(i.leverage) || !usable(i.mmrPct)) return { ok: false, errors };
  if (1 / i.leverage <= i.mmrPct / 100) return { ok: false, errors: [`At ${i.leverage}x the starting margin (${(100 / i.leverage).toFixed(2)}%) is not above the maintenance margin, so the position would be liquidated as soon as it opens.`] };
  const liqPrice = liquidationPrice(i.side, i.entry, i.leverage, i.mmrPct);
  const distancePct = (Math.abs(liqPrice - i.entry) / i.entry) * 100;
  let notional: number | null = null;
  let quantity: number | null = null;
  let marginLost: number | null = null;
  if (i.margin !== null && usable(i.margin)) {
    notional = i.margin * i.leverage;
    quantity = notional / i.entry;
    marginLost = i.margin - (i.mmrPct / 100) * liqPrice * quantity;
  }
  if (![liqPrice, distancePct, notional ?? 0, marginLost ?? 0].every(Number.isFinite)) return { ok: false, errors: ["These numbers are too large to calculate."] };
  return { ok: true, value: { side: i.side, liqPrice, distancePct, initialMarginPct: 100 / i.leverage, notional, quantity, marginLost, ladder: priceLadder(i.side, i.entry, liqPrice) } };
}
