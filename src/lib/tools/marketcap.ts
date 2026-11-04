import { type Calc, usable } from "./common";

export interface McapInput { price: number | null; current: number | null; target: number | null }
export interface McapResult { multiple: number; impliedPrice: number; impliedSupply: number; changePct: number }

/** What a token would cost at a different market cap, holding supply fixed. Works the same for fully diluted value. */
export function marketCapWhatIf(i: McapInput): Calc<McapResult> {
  const errors: string[] = [];
  if (!usable(i.price) || i.price <= 0) errors.push("Current price must be greater than zero.");
  if (!usable(i.current) || i.current <= 0) errors.push("Current market cap must be greater than zero.");
  if (!usable(i.target) || i.target <= 0) errors.push("Target market cap must be greater than zero.");
  if (errors.length || !usable(i.price) || !usable(i.current) || !usable(i.target)) return { ok: false, errors };
  const multiple = i.target / i.current;
  const impliedPrice = i.price * multiple;
  const impliedSupply = i.current / i.price;
  if (![multiple, impliedPrice, impliedSupply].every(Number.isFinite)) return { ok: false, errors: ["These numbers are too large to calculate."] };
  return { ok: true, value: { multiple, impliedPrice, impliedSupply, changePct: (multiple - 1) * 100 } };
}
