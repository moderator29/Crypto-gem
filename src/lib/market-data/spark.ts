import { getNetwork } from "./networks";
import { geckoTerminal } from "./providers/geckoterminal";

const TTL_MS = 15 * 60_000;
const cache = new Map<string, { at: number; points: number[] }>();

/** Seven days of closing prices (4 hour candles) for one pool. Real DEX data, cached 15 minutes. Throws when the provider has nothing. */
export async function getSparkline(networkId: string, pool: string): Promise<number[]> {
  const key = `${networkId}:${pool}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.points;
  const slug = getNetwork(networkId)?.geckoterminal;
  if (!slug) return [];
  const candles = await geckoTerminal.ohlcv(slug, pool, "hour", 4, 42);
  const points = candles.map((c) => c.close).filter((n) => Number.isFinite(n) && n > 0);
  if (cache.size > 500) cache.clear();
  cache.set(key, { at: Date.now(), points });
  return points;
}
