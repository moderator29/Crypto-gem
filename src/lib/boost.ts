export interface ActiveWindow {
  ends_at: string | null;
}

/**
 * Start and end for a newly paid boost, using server time only.
 * A repeat purchase for the same project queues after the current boost
 * instead of overlapping, so extending never wastes the first purchase.
 */
export function boostWindow(hours: number, existing: ActiveWindow[], now = new Date()): { startsAt: Date; endsAt: Date } {
  const latestEnd = existing.map((e) => (e.ends_at ? Date.parse(e.ends_at) : 0)).reduce((a, b) => Math.max(a, b), 0);
  const startsAt = new Date(Math.max(now.getTime(), latestEnd));
  return { startsAt, endsAt: new Date(startsAt.getTime() + hours * 3_600_000) };
}
