const MAX_AGE_MS = 120_000;
const cache = new Map<string, { rate: number; at: number }>();

function endpoint(): { base: string; headers: Record<string, string> } {
  const key = process.env.COINGECKO_API_KEY;
  if (key && process.env.COINGECKO_API_PLAN === "pro") return { base: "https://pro-api.coingecko.com/api/v3", headers: { "x-cg-pro-api-key": key } };
  if (key) return { base: "https://api.coingecko.com/api/v3", headers: { "x-cg-demo-api-key": key } };
  return { base: "https://api.coingecko.com/api/v3", headers: {} };
}

/** USD price of a CoinGecko coin id. Cached for at most two minutes. Never returns a stale or invented price: throws instead. */
export async function usdRate(priceId: string): Promise<number> {
  const hit = cache.get(priceId);
  if (hit && Date.now() - hit.at < MAX_AGE_MS) return hit.rate;
  const { base, headers } = endpoint();
  const res = await fetch(`${base}/simple/price?ids=${encodeURIComponent(priceId)}&vs_currencies=usd`, { headers, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!res.ok) throw new Error(`Price source HTTP ${res.status}`);
  const body = (await res.json()) as Record<string, { usd?: number } | undefined>;
  const rate = body[priceId]?.usd;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) throw new Error("Price unavailable");
  cache.set(priceId, { rate, at: Date.now() });
  return rate;
}

export function clearRateCache(): void {
  cache.clear();
}
