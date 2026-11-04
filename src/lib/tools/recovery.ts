import { type Calc, usable } from "./common";

export interface ChangeResult { changePct: number; multiple: number; recoverPct: number | null }
export interface RecoveryResult { lossPct: number; gainNeededPct: number; remaining: number }

/** Percent move from one price to another, plus the move needed to get back from there (null when the new price is zero). */
export function percentChange(from: number | null, to: number | null): Calc<ChangeResult> {
  const errors: string[] = [];
  if (!usable(from) || from <= 0) errors.push("Starting price must be greater than zero.");
  if (!usable(to) || to < 0) errors.push("New price must be zero or more.");
  if (errors.length || !usable(from) || !usable(to)) return { ok: false, errors };
  const multiple = to / from;
  return { ok: true, value: { changePct: (multiple - 1) * 100, multiple, recoverPct: to === 0 ? null : (from / to - 1) * 100 } };
}

/** The gain needed to get back to even after a loss. A 50% loss needs a 100% gain. A 100% loss cannot be recovered. */
export function recoveryGain(lossPct: number | null): Calc<RecoveryResult> {
  if (!usable(lossPct)) return { ok: false, errors: ["Enter the loss as a percentage."] };
  if (lossPct <= 0) return { ok: false, errors: ["Loss must be above 0%."] };
  if (lossPct >= 100) return { ok: false, errors: ["A loss of 100% or more leaves nothing to recover from."] };
  const remaining = 1 - lossPct / 100;
  return { ok: true, value: { lossPct, gainNeededPct: (1 / remaining - 1) * 100, remaining: remaining * 100 } };
}
