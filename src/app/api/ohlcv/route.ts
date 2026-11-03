import { ProviderError } from "@/lib/market-data/errors";
import { getNetwork } from "@/lib/market-data/networks";
import { geckoTerminal } from "@/lib/market-data/providers/geckoterminal";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

const FRAMES = {
  "1m": ["minute", 1],
  "5m": ["minute", 5],
  "15m": ["minute", 15],
  "1h": ["hour", 1],
  "4h": ["hour", 4],
  "1d": ["day", 1],
} as const;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const slug = getNetwork(u.searchParams.get("network") ?? "")?.geckoterminal;
  const pool = u.searchParams.get("pool") ?? "";
  const tf = u.searchParams.get("tf") ?? "1h";
  if (!slug || !/^[A-Za-z0-9_.:-]{10,100}$/.test(pool) || !(tf in FRAMES)) return Response.json({ error: "Invalid parameters" }, { status: 400 });
  const rl = rateLimit(`ohlcv:${clientKey(req)}`, 60, 60_000);
  if (!rl.ok) return Response.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  const [unit, agg] = FRAMES[tf as keyof typeof FRAMES];
  try {
    const candles = await geckoTerminal.ohlcv(slug, pool, unit, agg);
    return Response.json({ candles, source: "geckoterminal", generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "public, s-maxage=20" } });
  } catch (err) {
    const kind = err instanceof ProviderError ? err.kind : "unavailable";
    return Response.json({ error: "Chart data unavailable", kind }, { status: kind === "not_found" ? 404 : kind === "rate_limited" ? 429 : 502 });
  }
}
