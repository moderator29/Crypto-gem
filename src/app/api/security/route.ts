import { getRisk } from "@/lib/market-data/goplus";
import { classifyAddress } from "@/lib/market-data/identifiers";
import { getNetwork } from "@/lib/market-data/networks";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const network = u.searchParams.get("network") ?? "";
  const address = u.searchParams.get("address") ?? "";
  if (!getNetwork(network) || classifyAddress(address) !== "evm") return Response.json({ report: null, covered: false });
  if (!rateLimit(`sec:${clientKey(req)}`, 30, 60_000).ok) return Response.json({ error: "Too many requests" }, { status: 429 });
  try {
    const report = await getRisk(network, address);
    return Response.json({ report, covered: true }, { headers: { "Cache-Control": "public, s-maxage=900" } });
  } catch {
    return Response.json({ error: "Security data is unavailable right now." }, { status: 502 });
  }
}
