import { classifyAddress } from "@/lib/market-data/identifiers";
import { getNetwork } from "@/lib/market-data/networks";
import { getHolders } from "@/lib/market-data/token-extras";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const slug = getNetwork(u.searchParams.get("network") ?? "")?.geckoterminal;
  const address = u.searchParams.get("address") ?? "";
  if (!slug || !/^[A-Za-z0-9_.:-]{10,100}$/.test(address) || classifyAddress(address) === "unknown") return Response.json({ error: "Invalid parameters" }, { status: 400 });
  const rl = rateLimit(`holders:${clientKey(req)}`, 30, 60_000);
  if (!rl.ok) return Response.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  const result = await getHolders(slug, address);
  return Response.json(result, { headers: { "Cache-Control": "public, s-maxage=60" } });
}
