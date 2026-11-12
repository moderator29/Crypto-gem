import { classifyAddress, normalizeAddress } from "@/lib/market-data/identifiers";
import { getNetwork } from "@/lib/market-data/networks";
import { geckoTerminal } from "@/lib/market-data/providers/geckoterminal";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

/** Latest price for one token, used by the token page to stay live. Provider responses are cached for a minute on the server. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const net = getNetwork(u.searchParams.get("network") ?? "");
  const address = u.searchParams.get("address") ?? "";
  if (!net?.geckoterminal || classifyAddress(address) === "unknown") return Response.json({ error: "Invalid token" }, { status: 400 });
  if (!rateLimit(`price:${clientKey(req)}`, 60, 60_000).ok) return Response.json({ error: "Too many requests" }, { status: 429 });
  try {
    const t = await geckoTerminal.token(net.geckoterminal, normalizeAddress(address));
    return Response.json({ priceUsd: t.priceUsd, at: t.observedAt });
  } catch {
    return Response.json({ error: "Price unavailable" }, { status: 502 });
  }
}
