import { classifyAddress } from "@/lib/market-data/identifiers";
import { dexscreener, networkFromDexScreener } from "@/lib/market-data/providers/dexscreener";
import { geckoTerminal } from "@/lib/market-data/providers/geckoterminal";
import { dedupeByToken } from "@/lib/market-data/ranking";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 100) return Response.json({ results: [], isAddress: false });
  const rl = rateLimit(`search:${clientKey(req)}`, 40, 60_000);
  if (!rl.ok) return Response.json({ error: "Too many searches." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  const [gt, ds] = await Promise.allSettled([geckoTerminal.searchPools(q), classifyAddress(q) !== "unknown" ? dexscreener.tokenPairs(q) : dexscreener.search(q)]);
  // DexScreener fills chains or tokens GeckoTerminal has not indexed yet (for example new Robinhood Chain tokens).
  const extra = ds.status === "fulfilled" ? [...new Set(ds.value.map((x) => networkFromDexScreener(x.chainId)).filter((n): n is string => Boolean(n)))].flatMap((n) => dexscreener.toPools(ds.value, "", n)) : [];
  if (gt.status === "rejected" && extra.length === 0) return Response.json({ error: "Search is temporarily unavailable." }, { status: 502 });
  try {
    const pools = [...(gt.status === "fulfilled" ? gt.value.pools : []), ...extra];
    const seen = new Set<string>();
    const unique = dedupeByToken(pools).filter((p) => { const k = `${p.networkId}:${p.baseToken.address.startsWith("0x") ? p.baseToken.address.toLowerCase() : p.baseToken.address}`; if (seen.has(k)) return false; seen.add(k); return true; });
    const results = unique.slice(0, 12).map((p) => ({
      networkId: p.networkId,
      address: p.baseToken.address,
      name: p.baseToken.name,
      symbol: p.baseToken.symbol,
      imageUrl: p.baseToken.imageUrl,
      priceUsd: p.priceUsd,
      liquidityUsd: p.liquidityUsd,
      poolAddress: p.address,
    }));
    return Response.json({ results, isAddress: classifyAddress(q) !== "unknown" });
  } catch {
    return Response.json({ error: "Search is temporarily unavailable." }, { status: 502 });
  }
}
