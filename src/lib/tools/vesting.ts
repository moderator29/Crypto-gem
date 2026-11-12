import { type Calc, usable } from "./common";

export interface VestingInput { total: number | null; cliff: number | null; linear: number | null; tgePct: number | null }
export interface VestingRow { month: number; released: number; locked: number; unlocked: number; releasedPct: number }
export interface VestingResult {
  rows: VestingRow[];
  totalMonths: number;
  atStart: number;
  perMonth: number;
  firstUnlockMonth: number;
}

export const MAX_VESTING_MONTHS = 240;

/**
 * Release schedule for a token grant. An optional share unlocks at month 0, nothing more unlocks during the cliff,
 * then the rest unlocks in equal steps each month until the linear period ends. With no linear period the rest unlocks when the cliff ends.
 */
export function vesting(i: VestingInput): Calc<VestingResult> {
  const errors: string[] = [];
  const tge = i.tgePct ?? 0;
  if (!usable(i.total) || i.total <= 0) errors.push("Total tokens must be greater than zero.");
  if (!usable(i.cliff) || !Number.isInteger(i.cliff) || i.cliff < 0 || i.cliff > 120) errors.push("Cliff must be a whole number of months from 0 to 120.");
  if (!usable(i.linear) || !Number.isInteger(i.linear) || i.linear < 0 || i.linear > 120) errors.push("Linear period must be a whole number of months from 0 to 120.");
  if (i.tgePct !== null && (!usable(i.tgePct) || i.tgePct < 0 || i.tgePct > 100)) errors.push("Unlocked at start must be between 0% and 100%.");
  if (errors.length || !usable(i.total) || !usable(i.cliff) || !usable(i.linear)) return { ok: false, errors };
  const months = i.cliff + i.linear;
  if (months < 1) return { ok: false, errors: ["Set a cliff or a linear period of at least one month."] };
  if (months > MAX_VESTING_MONTHS) return { ok: false, errors: [`Cliff plus linear period cannot exceed ${MAX_VESTING_MONTHS} months.`] };
  const atStart = (i.total * tge) / 100;
  const rest = i.total - atStart;
  const rows: VestingRow[] = [];
  let prev = 0;
  for (let m = 0; m <= months; m++) {
    let released: number;
    if (m === months) released = i.total;
    else if (m < i.cliff) released = atStart;
    else released = atStart + rest * ((m - i.cliff) / i.linear);
    rows.push({ month: m, released, locked: Math.max(0, i.total - released), unlocked: released - prev, releasedPct: (released / i.total) * 100 });
    prev = released;
  }
  if (!rows.every((r) => Number.isFinite(r.released))) return { ok: false, errors: ["These numbers are too large to calculate."] };
  const first = rows.find((r) => r.month > 0 && r.unlocked > 0);
  return { ok: true, value: { rows, totalMonths: months, atStart, perMonth: i.linear > 0 ? rest / i.linear : 0, firstUnlockMonth: first ? first.month : months } };
}
