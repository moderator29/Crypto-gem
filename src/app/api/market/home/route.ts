import { ProviderError } from "@/lib/market-data/errors";
import { getHomeData } from "@/lib/market-data/home";
import { getNetwork } from "@/lib/market-data/networks";

export const dynamic = "force-dynamic";

/** One aggregate call powers the whole homepage, so the page never fans out into dozens of requests. */
export async function GET(req: Request) {
  const networkId = new URL(req.url).searchParams.get("network");
  if (networkId && !getNetwork(networkId)?.geckoterminal) return Response.json({ error: "Unknown network" }, { status: 400 });
  try {
    return Response.json(await getHomeData(networkId), { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
  } catch (err) {
    const kind = err instanceof ProviderError ? err.kind : "unavailable";
    return Response.json({ error: "Market data is temporarily unavailable.", kind }, { status: kind === "rate_limited" ? 429 : 502 });
  }
}
