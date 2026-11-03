import { describe, expect, it } from "vitest";
import { chainPulse, heatBucket } from "@/lib/market-data/pulse";
import type { PoolSummary } from "@/lib/market-data/types";

const now = Date.parse("2026-12-01T12:00:00Z");
const pool = (id: string, net: string, o: Partial<PoolSummary> = {}): PoolSummary => ({
  id, networkId: net, address: id, name: id, dex: null, createdAt: "2026-11-01T00:00:00Z",
  baseToken: { networkId: net, address: id, name: id, symbol: id, imageUrl: null, decimals: 18, coingeckoId: null }, quoteToken: null,
  priceUsd: 1, liquidityUsd: 50_000, fdvUsd: null, marketCapUsd: null, volumeUsd: { m5: null, h1: null, h6: null, h24: 1000 },
  change: { m5: null, h1: null, h6: null, h24: 5 }, txns24h: { buys: 10, sells: 5 }, txns1h: null, source: "geckoterminal", observedAt: "x", ...o,
});

describe("chainPulse", () => {
  it("uses the median so one pumping pool does not colour the chain", () => {
    const r = chainPulse([pool("a", "solana", { change: { m5: null, h1: null, h6: null, h24: 2 } }), pool("b", "solana", { change: { m5: null, h1: null, h6: null, h24: 3 } }), pool("c", "solana", { change: { m5: null, h1: null, h6: null, h24: 9000 } })], [], 5000, now);
    expect(r[0]?.medianChange24h).toBe(3);
  });
  it("ignores dust pools in price statistics but still counts them", () => {
    const r = chainPulse([pool("a", "base", { liquidityUsd: 100, change: { m5: null, h1: null, h6: null, h24: 900 } }), pool("b", "base", { change: { m5: null, h1: null, h6: null, h24: -4 } })], [], 5000, now);
    expect(r[0]).toMatchObject({ pools: 2, medianChange24h: -4 });
  });
  it("de-duplicates pools seen in both lists, counts new ones, orders by volume", () => {
    const fresh = pool("n", "eth", { createdAt: "2026-12-01T10:00:00Z", volumeUsd: { m5: null, h1: null, h6: null, h24: 5000 } });
    const r = chainPulse([fresh, pool("x", "solana")], [fresh], 5000, now);
    expect(r.map((c) => c.networkId)).toEqual(["eth", "solana"]);
    expect(r[0]).toMatchObject({ pools: 1, newPools: 1 });
  });
  it("reports null when nothing is measurable", () => {
    const r = chainPulse([pool("a", "tron", { liquidityUsd: 10 })], [], 5000, now);
    expect(r[0]?.medianChange24h).toBeNull();
    expect(r[0]?.buySellRatio).toBeNull();
  });
});

describe("heatBucket", () => {
  it("buckets symmetrically and treats unknown as neutral", () => {
    expect([heatBucket(null), heatBucket(0.5), heatBucket(2), heatBucket(10), heatBucket(40), heatBucket(-2), heatBucket(-30)]).toEqual([0, 0, 1, 2, 3, -1, -3]);
  });
});
