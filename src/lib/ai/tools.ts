import type Anthropic from "@anthropic-ai/sdk";
import { classifyAddress, normalizeAddress } from "@/lib/market-data/identifiers";
import { getNetwork } from "@/lib/market-data/networks";
import { geckoTerminal } from "@/lib/market-data/providers/geckoterminal";
import { dedupeByToken, heatingUp, rankOrganic } from "@/lib/market-data/ranking";
import type { PoolSummary } from "@/lib/market-data/types";
import { marketRiskSignals } from "@/lib/risk";

export const COPILOT_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_tokens",
    description: "Search tokens and pools across networks by name, symbol or contract address. Returns network and address for each match so the right token can be chosen.",
    input_schema: { type: "object", properties: { query: { type: "string", maxLength: 100 } }, required: ["query"] },
  },
  {
    name: "get_trending",
    description: "Organic trending ranking (volume, liquidity, activity, momentum, freshness) with measured heating-up signals. Optional network id such as solana, ethereum, base, bsc.",
    input_schema: { type: "object", properties: { network: { type: "string" } } },
  },
  {
    name: "get_new_pairs",
    description: "Most recently created liquidity pools. Optional network id.",
    input_schema: { type: "object", properties: { network: { type: "string" } } },
  },
  {
    name: "get_token",
    description: "Market data, pools and derived market risk signals for one token. Requires network id and contract address.",
    input_schema: { type: "object", properties: { network: { type: "string" }, address: { type: "string" } }, required: ["network", "address"] },
  },
  {
    name: "compare_tokens",
    description: "Compare up to three tokens side by side. Each needs network id and address.",
    input_schema: {
      type: "object",
      properties: { tokens: { type: "array", maxItems: 3, items: { type: "object", properties: { network: { type: "string" }, address: { type: "string" } }, required: ["network", "address"] } } },
      required: ["tokens"],
    },
  },
];

const brief = (p: PoolSummary) => ({
  network: p.networkId,
  address: p.baseToken.address,
  name: p.baseToken.name,
  symbol: p.baseToken.symbol,
  priceUsd: p.priceUsd,
  liquidityUsd: p.liquidityUsd,
  volume24hUsd: p.volumeUsd.h24,
  change1hPct: p.change.h1,
  change24hPct: p.change.h24,
  marketCapUsd: p.marketCapUsd,
  fdvUsd: p.fdvUsd,
  txns24h: p.txns24h,
  poolAgeCreatedAt: p.createdAt,
  dex: p.dex,
});

const meta = () => ({ source: "GeckoTerminal", observedAt: new Date().toISOString(), note: "DEX pool data. Values can differ from other venues. Null means unavailable." });

async function tokenReport(networkId: string, addressRaw: string) {
  const net = getNetwork(networkId);
  const kind = classifyAddress(addressRaw);
  if (!net?.geckoterminal || kind === "unknown" || kind === "bitcoin") return { error: "Invalid network or address" };
  const address = normalizeAddress(addressRaw);
  const [pools, info] = await Promise.allSettled([geckoTerminal.poolsForToken(net.geckoterminal, address), geckoTerminal.token(net.geckoterminal, address)]);
  const list = pools.status === "fulfilled" ? pools.value.pools : [];
  if (list.length === 0 && info.status !== "fulfilled") return { error: "No data found for this token" };
  const sorted = [...list].sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0));
  const t = info.status === "fulfilled" ? info.value : null;
  return {
    network: net.id,
    address,
    name: t?.identity?.name ?? sorted[0]?.baseToken.name ?? null,
    symbol: t?.identity?.symbol ?? sorted[0]?.baseToken.symbol ?? null,
    priceUsd: t?.priceUsd ?? sorted[0]?.priceUsd ?? null,
    marketCapUsd: t?.marketCapUsd ?? sorted[0]?.marketCapUsd ?? null,
    fdvUsd: t?.fdvUsd ?? sorted[0]?.fdvUsd ?? null,
    totalLiquidityUsd: t?.liquidityUsd ?? null,
    volume24hUsd: t?.volume24hUsd ?? sorted[0]?.volumeUsd.h24 ?? null,
    topPools: sorted.slice(0, 5).map(brief),
    marketRiskSignals: marketRiskSignals(sorted).map((r) => ({ level: r.level, message: r.message })),
    riskSignalsNote: "Derived from pool data only. Not an audit.",
    ...meta(),
  };
}

/** Executes one tool call. Always returns a JSON string and never throws, so a failed lookup becomes an honest tool result. */
export async function runTool(name: string, input: unknown): Promise<string> {
  try {
    const i = (input ?? {}) as Record<string, unknown>;
    const netSlug = (v: unknown) => {
      if (typeof v !== "string" || !v) return { ok: true as const, slug: undefined };
      const n = getNetwork(v);
      return n?.geckoterminal ? { ok: true as const, slug: n.geckoterminal } : { ok: false as const, slug: undefined };
    };
    switch (name) {
      case "search_tokens": {
        const q = String(i.query ?? "").trim().slice(0, 100);
        if (q.length < 2) return JSON.stringify({ error: "Query too short" });
        const { pools } = await geckoTerminal.searchPools(q);
        return JSON.stringify({ results: dedupeByToken(pools).slice(0, 8).map(brief), ...meta() });
      }
      case "get_trending": {
        const n = netSlug(i.network);
        if (!n.ok) return JSON.stringify({ error: "Unknown network id" });
        const { pools } = await geckoTerminal.trendingPools(n.slug);
        return JSON.stringify({
          organicRanking: rankOrganic(pools, 10).map((s, idx) => ({ rank: idx + 1, organicScore: Math.round(s.score), ...brief(s.pool) })),
          heatingUp: heatingUp(dedupeByToken(pools)).slice(0, 5).map((h) => ({ reason: h.reason, ...brief(h.pool) })),
          ...meta(),
        });
      }
      case "get_new_pairs": {
        const n = netSlug(i.network);
        if (!n.ok) return JSON.stringify({ error: "Unknown network id" });
        const { pools } = await geckoTerminal.newPools(n.slug);
        return JSON.stringify({ newPools: pools.slice(0, 10).map(brief), ...meta() });
      }
      case "get_token":
        return JSON.stringify(await tokenReport(String(i.network ?? ""), String(i.address ?? "")));
      case "compare_tokens": {
        const list = Array.isArray(i.tokens) ? i.tokens.slice(0, 3) : [];
        if (list.length < 2) return JSON.stringify({ error: "Provide at least two tokens" });
        const reports = await Promise.all(list.map((t: { network?: unknown; address?: unknown }) => tokenReport(String(t.network ?? ""), String(t.address ?? ""))));
        return JSON.stringify({ tokens: reports });
      }
      default:
        return JSON.stringify({ error: "Unknown tool" });
    }
  } catch (e) {
    return JSON.stringify({ error: "Data lookup failed", kind: (e as { kind?: string }).kind ?? "unavailable" });
  }
}
