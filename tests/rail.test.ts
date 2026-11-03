import { describe, expect, it } from "vitest";
import type { HomeData } from "@/lib/market-data/home";
import type { PoolSummary } from "@/lib/market-data/types";
import { buildRailItems } from "@/lib/rail";

const now = Date.parse("2026-12-01T12:00:00Z");
const pool = (id: string, o: Partial<PoolSummary> = {}): PoolSummary => ({
  id, networkId: "solana", address: id, name: id, dex: null, createdAt: "2026-11-30T00:00:00Z",
  baseToken: { networkId: "solana", address: id, name: id, symbol: id.toUpperCase(), imageUrl: null, decimals: 6, coingeckoId: null }, quoteToken: null,
  priceUsd: 1, liquidityUsd: 100_000, fdvUsd: null, marketCapUsd: null, volumeUsd: { m5: null, h1: 5000, h6: null, h24: 90_000 },
  change: { m5: null, h1: null, h6: null, h24: 10 }, txns24h: { buys: 10, sells: 10 }, txns1h: null, source: "geckoterminal", observedAt: "x", ...o,
});
const data = (o: Partial<Omit<HomeData, "organic">> & { organic?: PoolSummary[] } = {}): HomeData => ({ heating: [], fresh: [], gainers: [], losers: [], volume: [], meta: { source: "geckoterminal", stale: false, generatedAt: "x", health: [] }, ...o, organic: (o.organic ?? []).map((p) => ({ ...p, score: 50 })) });

describe("buildRailItems", () => {
  it("builds market cards only from measured data and never invents advertisers", () => {
    const items = buildRailItems({ data: data({ organic: [pool("a", { change: { m5: null, h1: null, h6: null, h24: 40 } }), pool("b", { change: { m5: null, h1: null, h6: null, h24: -30 } })] }), chains: [], campaigns: [], now });
    const market = items.filter((i) => i.kind === "market");
    expect(market.map((m) => m.eyebrow)).toEqual(expect.arrayContaining(["Top mover, 24h", "Biggest decline, 24h", "Volume leader"]));
    const sponsored = items.filter((i) => i.kind === "sponsored");
    expect(sponsored).toHaveLength(1);
    expect(sponsored[0]).toMatchObject({ available: true, title: "Your project here" });
  });
  it("skips thin pools so dust cannot be a top mover", () => {
    const items = buildRailItems({ data: data({ organic: [pool("dust", { liquidityUsd: 500, change: { m5: null, h1: null, h6: null, h24: 9000 } })] }), chains: [], campaigns: [], now });
    expect(items.some((i) => i.id.startsWith("mover-"))).toBe(false);
  });
  it("uses real campaigns when sold and stops showing the open slot at two or more", () => {
    const camp = (id: string) => ({ id, placement: "hero" as const, projectName: "Acme", headline: "Acme launch", creativeDesktop: "https://x/d.png", creativeMobile: null });
    const one = buildRailItems({ data: data(), chains: [], campaigns: [camp("c1")], now });
    expect(one.filter((i) => i.kind === "sponsored")).toHaveLength(2);
    const two = buildRailItems({ data: data(), chains: [], campaigns: [camp("c1"), camp("c2")], now });
    expect(two.filter((i) => i.kind === "sponsored").every((i) => !i.available)).toBe(true);
  });
  it("interleaves types so the same kind does not clump", () => {
    const items = buildRailItems({ data: data({ organic: [pool("a"), pool("b", { change: { m5: null, h1: null, h6: null, h24: -20 } })], heating: [{ pool: pool("h"), ratio: 4, reason: "x" }], fresh: [pool("n")] }), chains: [{ networkId: "solana", name: "Solana", pools: 5, newPools: 1, volume24hUsd: 1e6, liquidityUsd: 1e6, medianChange24h: 3, buySellRatio: 1 }], campaigns: [], now });
    const kinds = items.map((i) => i.kind[0]).join("");
    // The interleave pattern governs the head of the rail; once a queue is empty the tail is whatever remains.
    expect(kinds.slice(0, 9)).not.toMatch(/p{3}|m{4}|s{2}/);
    expect(items.length).toBeGreaterThan(8);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
});
