import { getNetwork, NETWORKS } from "@/lib/market-data/networks";
import { coingecko } from "@/lib/market-data/providers/coingecko";
import { dexscreener, networkFromDexScreener } from "@/lib/market-data/providers/dexscreener";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

interface Candidate {
  key: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  networkId: string | null;
  address: string | null;
  source: "dexscreener" | "coingecko";
  note: string | null;
  liquidityUsd: number | null;
}

/**
 * Find a token by name or ticker when the owner has no contract address handy.
 * DexScreener answers with live pairs (an address on a network), CoinGecko adds listed coins and their contracts.
 * Coins with no contract come back with a note, because they cannot be auto-detected.
 */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 60) return Response.json({ candidates: [] });
  if (!rateLimit(`dsearch:${clientKey(req)}`, 30, 60_000).ok) return Response.json({ error: "Too many searches." }, { status: 429 });

  const [ds, cg] = await Promise.allSettled([dexscreener.search(q), coingecko.search(q)]);
  const out: Candidate[] = [];

  if (ds.status === "fulfilled") {
    for (const p of ds.value.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))) {
      const networkId = networkFromDexScreener(p.chainId);
      const key = `${networkId}:${p.baseToken.address}`;
      if (!networkId || !getNetwork(networkId)?.contractLookup || out.some((c) => c.key === key)) continue;
      out.push({ key, name: p.baseToken.name, symbol: p.baseToken.symbol, imageUrl: p.info?.imageUrl ?? null, networkId, address: p.baseToken.address, source: "dexscreener", note: null, liquidityUsd: p.liquidity?.usd ?? null });
      if (out.length >= 8) break;
    }
  }

  if (cg.status === "fulfilled") {
    const top = cg.value.slice(0, 3);
    const platforms = await Promise.allSettled(top.map((c) => coingecko.platforms(c.id)));
    top.forEach((coin, i) => {
      const r = platforms[i];
      const map = r?.status === "fulfilled" ? r.value : {};
      const rows = NETWORKS.filter((n) => n.coingecko && map[n.coingecko]).slice(0, 2);
      if (rows.length === 0) {
        out.push({ key: `cg:${coin.id}`, name: coin.name, symbol: coin.symbol, imageUrl: coin.imageUrl, networkId: null, address: null, source: "coingecko", note: r?.status === "fulfilled" ? "No token contract. Use Standard Listing." : "Contract lookup unavailable", liquidityUsd: null });
        return;
      }
      for (const n of rows) {
        const address = map[n.coingecko as string] as string;
        const key = `${n.id}:${address}`;
        if (!out.some((c) => c.key.toLowerCase() === key.toLowerCase())) out.push({ key, name: coin.name, symbol: coin.symbol, imageUrl: coin.imageUrl, networkId: n.id, address, source: "coingecko", note: coin.rank ? `Rank #${coin.rank} on CoinGecko` : null, liquidityUsd: null });
      }
    });
  }

  if (out.length === 0 && ds.status === "rejected" && cg.status === "rejected") return Response.json({ error: "Search is temporarily unavailable." }, { status: 502 });
  return Response.json({ candidates: out.slice(0, 12) });
}
