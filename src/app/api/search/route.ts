import { classifyAddress } from "@/lib/market-data/identifiers";
import { geckoTerminal } from "@/lib/market-data/providers/geckoterminal";
import { dedupeByToken } from "@/lib/market-data/ranking";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 100) return Response.json({ results: [], isAddress: false });
  const rl = rateLimit(`search:${clientKey(req)}`, 40, 60_000);
  if (!rl.ok) return Response.json({ error: "Too many searches." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  try {
    const { pools } = await geckoTerminal.searchPools(q);
    const results = dedupeByToken(pools).slice(0, 12).map((p) => ({
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
