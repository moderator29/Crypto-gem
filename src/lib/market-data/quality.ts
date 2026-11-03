import type { PoolSummary } from "./types";

/** Slurs and obvious abuse we refuse to put on a public front page. Detection pages stay reachable by direct link. */
const BLOCKED = /\b(nigg\w*|fagg?\w*|retard\w*|kike|chink|spic|tranny|rape\w*|nazi|hitler|isis|kkk|cunt)\b/i;

/** True when a token name and symbol are fit for curated lists: bounded length, no abuse, not a link or sentence. */
export function isPresentable(name: string | null | undefined, symbol: string | null | undefined): boolean {
  const n = (name ?? "").trim();
  const s = (symbol ?? "").trim();
  if (!s || s.length > 14 || n.length > 40) return false;
  if (BLOCKED.test(n) || BLOCKED.test(s)) return false;
  if (/https?:|www\.|t\.me|\.(com|io|xyz)\b/i.test(n + " " + s)) return false;
  return true;
}

export const presentable = <T extends PoolSummary>(pools: T[]): T[] => pools.filter((p) => isPresentable(p.baseToken.name, p.baseToken.symbol));
