import { describe, expect, it } from "vitest";
import {
  alignedIndex, buyShare, changeHistogram, isFresh, matchesQuery, volumeShares, compareQuery, extent, extremes, heatIntensity, liquidityByDex, mapTiles, marketBreadth, parseCompareRefs,
  rankChains, rankSurges, surgeRatio, tail, toIndex, toPct, topMovers,
} from "@/lib/market-data/analytics";
import type { ChainPulse } from "@/lib/market-data/pulse";
import type { PoolSummary } from "@/lib/market-data/types";

const pool = (id: string, o: Partial<PoolSummary> = {}): PoolSummary => ({
  id, networkId: "solana", address: id, name: id, dex: "raydium", createdAt: null,
  baseToken: { networkId: "solana", address: id, name: id, symbol: id, imageUrl: null, decimals: 9, coingeckoId: null }, quoteToken: null,
  priceUsd: 1, liquidityUsd: 50_000, fdvUsd: null, marketCapUsd: null, volumeUsd: { m5: null, h1: 100, h6: null, h24: 2400 },
  change: { m5: null, h1: 1, h6: 2, h24: 3 }, txns24h: null, txns1h: null, source: "geckoterminal", observedAt: "x", ...o,
});
const chain = (networkId: string, o: Partial<ChainPulse> = {}): ChainPulse => ({ networkId, name: networkId, pools: 3, newPools: 1, volume24hUsd: 100, liquidityUsd: 1000, medianChange24h: 1, buySellRatio: 1, ...o });

describe("map helpers", () => {
  it("scales colour by window and clamps", () => {
    expect(heatIntensity(5, "h1")).toBe(1);
    expect(heatIntensity(-50, "h24")).toBe(-1);
    expect(heatIntensity(12.5, "h24")).toBe(0.5);
  });
  it("filters by chain, drops pools without the chosen change, sorts by size and de-duplicates", () => {
    const pools = [pool("a", { change: { m5: null, h1: null, h6: 4, h24: 1 } }), pool("b", { networkId: "base", volumeUsd: { m5: null, h1: 1, h6: 1, h24: 9000 } }), pool("c", { volumeUsd: { m5: null, h1: 1, h6: 1, h24: 5000 } }), pool("c")];
    expect(mapTiles(pools, "h1", "volume", null).map((t) => t.pool.id)).toEqual(["b", "c"]);
    expect(mapTiles(pools, "h6", "volume", "solana").map((t) => t.pool.id)).toEqual(["c", "a"]);
    expect(mapTiles(pools, "h24", "liquidity", null, 1)).toHaveLength(1);
  });
  it("reports a real extent or null", () => {
    expect(extent([3, null, -2, 8])).toEqual({ min: -2, max: 8 });
    expect(extent([null])).toBeNull();
  });
});

describe("chain race", () => {
  it("ranks by the metric, normalises to the leader and omits chains without the metric", () => {
    const rows = rankChains([chain("a", { volume24hUsd: 50 }), chain("b", { volume24hUsd: 200 }), chain("c", { volume24hUsd: 0 })], "volume");
    expect(rows.map((r) => r.networkId)).toEqual(["b", "a"]);
    expect(rows.map((r) => r.share)).toEqual([1, 0.25]);
    expect(rankChains([chain("a", { buySellRatio: null }), chain("b", { buySellRatio: 1.5 })], "buySell").map((r) => r.networkId)).toEqual(["b"]);
  });
  it("converts a ratio to a buy share", () => {
    expect(buyShare(1)).toBe(50);
    expect(buyShare(3)).toBe(75);
    expect(buyShare(null)).toBeNull();
  });
});

describe("unusual volume", () => {
  it("compares the last hour with the hourly average of the day", () => {
    expect(surgeRatio(pool("a", { volumeUsd: { m5: null, h1: 300, h6: null, h24: 2400 } }))).toBe(3);
    expect(surgeRatio(pool("a", { volumeUsd: { m5: null, h1: null, h6: null, h24: 2400 } }))).toBeNull();
  });
  it("keeps liquid pools above the threshold, strongest first", () => {
    const s = rankSurges([pool("a"), pool("b", { volumeUsd: { m5: null, h1: 500, h6: null, h24: 2400 } }), pool("c", { volumeUsd: { m5: null, h1: 900, h6: null, h24: 2400 }, liquidityUsd: 100 })]);
    expect(s.map((x) => x.pool.id)).toEqual(["b"]);
    expect(s[0]?.ratio).toBeCloseTo(5);
  });
});

describe("breadth, dex split, movers", () => {
  it("counts up, down and flat", () => {
    const b = marketBreadth([pool("a"), pool("b", { change: { m5: null, h1: null, h6: null, h24: -4 } }), pool("c", { change: { m5: null, h1: null, h6: null, h24: 0.1 } }), pool("d", { change: { m5: null, h1: null, h6: null, h24: null } })]);
    expect(b).toEqual({ up: 1, down: 1, flat: 1, total: 3 });
  });
  it("groups liquidity by dex and folds the tail into other", () => {
    const pools = [pool("a", { dex: "x", liquidityUsd: 60 }), pool("b", { dex: "y", liquidityUsd: 30 }), pool("c", { dex: "z", liquidityUsd: 10 }), pool("d", { dex: null, liquidityUsd: 999 })];
    const s = liquidityByDex(pools, 2);
    expect(s.map((r) => r.dex)).toEqual(["x", "y", "other"]);
    expect(s.reduce((t, r) => t + r.share, 0)).toBeCloseTo(1);
    expect(liquidityByDex([])).toEqual([]);
  });
  it("splits movers by direction above the liquidity floor", () => {
    const m = topMovers([pool("a"), pool("b", { change: { m5: null, h1: null, h6: null, h24: -9 } }), pool("c", { liquidityUsd: 10, change: { m5: null, h1: null, h6: null, h24: 500 } })]);
    expect(m.up.map((p) => p.id)).toEqual(["a"]);
    expect(m.down.map((p) => p.id)).toEqual(["b"]);
  });
});

describe("compare", () => {
  it("rebases to percent and to a 0 to 100 index", () => {
    expect(toPct([100, 150, 50])).toEqual([0, 50, -50]);
    expect(toPct([0, 1])).toEqual([]);
    expect(toIndex([10, 20, 30])).toEqual([0, 50, 100]);
    expect(toIndex([5, 5])).toEqual([50, 50]);
    expect(tail([1, 2, 3, 4], 2)).toEqual([3, 4]);
  });
  it("names best and worst only with two or more series", () => {
    expect(extremes([5, null, -2, 9])).toEqual({ best: 3, worst: 2 });
    expect(extremes([5, null])).toEqual({ best: null, worst: null });
  });
  it("aligns shorter series to the right edge", () => {
    expect(alignedIndex(3, 5, 1)).toBeNull();
    expect(alignedIndex(3, 5, 2)).toBe(0);
    expect(alignedIndex(3, 5, 4)).toBe(2);
  });
  it("validates, dedupes and caps shared tokens", () => {
    const addr = "0x1111111111111111111111111111111111111111";
    const refs = parseCompareRefs({ t: `ethereum:${addr},ETHEREUM:${addr},nope:${addr},ethereum:bad,ethereum:${addr.toUpperCase().replace("0X", "0x")}`, a: "solana:So11111111111111111111111111111111111111112" });
    expect(refs).toEqual([{ networkId: "ethereum", address: addr }, { networkId: "solana", address: "So11111111111111111111111111111111111111112" }]);
    const many = Array.from({ length: 9 }, (_, i) => `base:0x${String(i).repeat(40)}`).join(",");
    expect(parseCompareRefs({ t: many })).toHaveLength(5);
  });
  it("builds a short query and omits defaults", () => {
    expect(compareQuery([], "pct", "7d")).toBe("");
    expect(compareQuery([{ networkId: "base", address: "0xabcabcabcabc" }], "index", "24h")).toBe("?t=base%3A0xabcabcabcabc&m=index&r=24h");
    expect(compareQuery([{ networkId: "base", address: "0xabcabcabcabc" }], "pct", "7d")).toBe("?t=base%3A0xabcabcabcabc");
  });
});

describe("list helpers", () => {
  it("bins changes at the edges and ignores unknowns", () => {
    const at = (c: number | null) => pool(`p${c}`, { change: { m5: null, h1: null, h6: null, h24: c } });
    const h = changeHistogram([at(-30), at(-5), at(0.9), at(1), at(25), at(null)]);
    expect(h.map((b) => b.count)).toEqual([1, 0, 1, 1, 1, 0, 1]);
  });
  it("matches by name, symbol or address prefix", () => {
    const p = pool("abc", { baseToken: { networkId: "solana", address: "XyZ123", name: "Moon Cat", symbol: "MEOW", imageUrl: null, decimals: 9, coingeckoId: null } });
    expect([matchesQuery(p, ""), matchesQuery(p, "moon"), matchesQuery(p, "meow"), matchesQuery(p, "xyz"), matchesQuery(p, "dog")]).toEqual([true, true, true, true, false]);
  });
  it("calls only recent pools fresh", () => {
    const now = Date.parse("2026-12-01T12:00:00Z");
    expect(isFresh(pool("a", { createdAt: "2026-12-01T00:00:00Z" }), 48, now)).toBe(true);
    expect(isFresh(pool("a", { createdAt: "2026-11-01T00:00:00Z" }), 48, now)).toBe(false);
    expect(isFresh(pool("a", { createdAt: null }), 48, now)).toBe(false);
  });
  it("shares volume across chains and folds the tail", () => {
    const s = volumeShares([chain("a", { volume24hUsd: 60 }), chain("b", { volume24hUsd: 30 }), chain("c", { volume24hUsd: 10 })], 2);
    expect(s.map((r) => r.networkId)).toEqual(["a", "b", "other"]);
    expect(s.reduce((t, r) => t + r.share, 0)).toBeCloseTo(1);
    expect(volumeShares([chain("a", { volume24hUsd: 0 })])).toEqual([]);
  });
});
