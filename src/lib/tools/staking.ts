import { type Calc, usable } from "./common";

export const COMPOUND_OPTIONS = ["1", "4", "12", "52", "365"] as const;

export interface StakingInput { principal: number | null; aprPct: number | null; perYear: number | null; years: number | null }
export interface GrowthPoint { year: number; simple: number; compound: number }
export interface StakingResult {
  simpleFinal: number;
  compoundFinal: number;
  simpleEarned: number;
  compoundEarned: number;
  extraFromCompounding: number;
  apyPct: number;
  curve: GrowthPoint[];
  yearly: GrowthPoint[];
}

/** Value after t years with simple interest on the original amount only. */
export function simpleValue(p: number, aprPct: number, t: number): number {
  return p * (1 + (aprPct / 100) * t);
}

/** Value after t years when interest is added back n times a year. */
export function compoundValue(p: number, aprPct: number, n: number, t: number): number {
  return p * Math.pow(1 + aprPct / 100 / n, n * t);
}

/** Effective yearly rate in percent for a nominal APR compounded n times a year. */
export function apyFromApr(aprPct: number, n: number): number {
  return (Math.pow(1 + aprPct / 100 / n, n) - 1) * 100;
}

/** Compare simple interest with compounding for a staked amount. Uses only the rate the person typed and assumes it stays constant. */
export function staking(i: StakingInput, steps = 48): Calc<StakingResult> {
  const errors: string[] = [];
  if (!usable(i.principal) || i.principal <= 0) errors.push("Amount staked must be greater than zero.");
  if (!usable(i.aprPct) || i.aprPct < 0 || i.aprPct > 1000) errors.push("APR must be between 0% and 1000%.");
  if (i.perYear === null || !(COMPOUND_OPTIONS as readonly string[]).includes(String(i.perYear))) errors.push("Choose how often rewards compound.");
  if (!usable(i.years) || i.years <= 0 || i.years > 100) errors.push("Years must be above 0 and at most 100.");
  if (errors.length || !usable(i.principal) || !usable(i.aprPct) || i.perYear === null || !usable(i.years)) return { ok: false, errors };
  const { principal: p, aprPct: r, perYear: n, years: y } = { principal: i.principal, aprPct: i.aprPct, perYear: i.perYear, years: i.years };
  const point = (t: number): GrowthPoint => ({ year: t, simple: simpleValue(p, r, t), compound: compoundValue(p, r, n, t) });
  const curve = Array.from({ length: steps + 1 }, (_, k) => point((y * k) / steps));
  const yearly: GrowthPoint[] = [];
  for (let t = 1; t <= Math.floor(y); t++) yearly.push(point(t));
  if (!Number.isInteger(y)) yearly.push(point(y));
  const end = point(y);
  if (![end.simple, end.compound, ...curve.map((c) => c.compound)].every(Number.isFinite)) return { ok: false, errors: ["These numbers are too large to calculate."] };
  return {
    ok: true,
    value: {
      simpleFinal: end.simple,
      compoundFinal: end.compound,
      simpleEarned: end.simple - p,
      compoundEarned: end.compound - p,
      extraFromCompounding: end.compound - end.simple,
      apyPct: apyFromApr(r, n),
      curve,
      yearly,
    },
  };
}
