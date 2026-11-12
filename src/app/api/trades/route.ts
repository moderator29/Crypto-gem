import { ProviderError } from "@/lib/market-data/errors";
import { getNetwork } from "@/lib/market-data/networks";
import { getTrades } from "@/lib/market-data/token-extras";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const slug = getNetwork(u.searchParams.get("network") ?? "")?.geckoterminal;
  const pool = u.searchParams.get("pool") ?? "";
  const invert = u.searchParams.get("invert") === "1";
  if (!slug || !/^[A-Za-z0-9_.:-]{10,100}$/.test(pool)) return Response.json({ error: "Invalid parameters" }, { status: 400 });
  const rl = rateLimit(`trades:${clientKey(req)}`, 60, 60_000);
  if (!rl.ok) return Response.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  try {
    const trades = await getTrades(slug, pool, invert);
    return Response.json({ trades, source: "geckoterminal", generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "public, s-maxage=20" } });
  } catch (err) {
    const kind = err instanceof ProviderError ? err.kind : "unavailable";
    return Response.json({ error: "Trades unavailable", kind }, { status: kind === "not_found" ? 404 : kind === "rate_limited" ? 429 : 502 });
  }
}
