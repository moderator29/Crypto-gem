export const VOTE_COOLDOWN_MS = 30 * 60_000;

/** Minutes the user still has to wait, or 0 when a vote is allowed. Uses server time only. */
export function cooldownMinutes(lastVoteAt: string | null, now = Date.now()): number {
  if (!lastVoteAt) return 0;
  const left = Date.parse(lastVoteAt) + VOTE_COOLDOWN_MS - now;
  return left > 0 ? Math.ceil(left / 60_000) : 0;
}
