import { getSparkline } from "@/lib/market-data/spark";
import { getNetwork } from "@/lib/market-data/networks";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const network = u.searchParams.get("network") ?? "";
  const pool = u.searchParams.get("pool") ?? "";
  if (!getNetwork(network)?.geckoterminal || !/^[A-Za-z0-9_.:-]{10,100}$/.test(pool)) return Response.json({ error: "Invalid parameters" }, { status: 400 });
  if (!rateLimit(`spark:${clientKey(req)}`, 120, 60_000).ok) return Response.json({ error: "Too many requests" }, { status: 429 });
  try {
    const points = await getSparkline(network, pool);
    return Response.json({ points }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } });
  } catch {
    return Response.json({ error: "Trend unavailable" }, { status: 502 });
  }
}
