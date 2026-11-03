export interface Booking {
  start: number;
  end: number;
  slot: number | null;
}

export interface PlacementRule {
  slots: number;
  exclusive: boolean;
}

const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) => a.start < b.end && b.start < a.end;

/**
 * Picks a slot for a requested window or reports it is sold out.
 * Exclusive placements hand out numbered slots and never double-sell one.
 * Shared placements are capped at `slots` concurrent campaigns. The database
 * exclusion constraint is the final guard against races for exclusive slots.
 */
export function allocate(rule: PlacementRule, existing: Booking[], want: { start: number; end: number }): { ok: true; slot: number | null } | { ok: false; reason: string } {
  if (want.end <= want.start) return { ok: false, reason: "Invalid dates" };
  const clash = existing.filter((b) => overlaps(b, want));
  if (rule.exclusive) {
    for (let slot = 1; slot <= rule.slots; slot++) {
      if (!clash.some((b) => b.slot === slot)) return { ok: true, slot };
    }
    return { ok: false, reason: "That placement is fully booked for these dates" };
  }
  // Peak concurrency within the window, so partial overlaps do not oversell.
  const points = [want.start, ...clash.flatMap((b) => [b.start, b.end]).filter((t) => t > want.start && t < want.end)];
  const peak = Math.max(0, ...points.map((t) => clash.filter((b) => b.start <= t && t < b.end).length));
  return peak < rule.slots ? { ok: true, slot: null } : { ok: false, reason: "That placement is fully booked for these dates" };
}

/** Allowed campaign lengths come from the price book: a length is bookable only if it has a price. */
export function priceFor(prices: Record<string, number | undefined>, days: number): number | null {
  const v = prices[String(days)];
  return typeof v === "number" && v >= 0 ? v : null;
}
