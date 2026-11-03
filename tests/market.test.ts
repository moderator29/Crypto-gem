import { describe, expect, it } from "vitest";
import { classifyAddress, normalizeAddress, sameAddress } from "@/lib/market-data/identifiers";
import { heatingUp, organicScore, dedupeByToken } from "@/lib/market-data/ranking";
import { normalizePools } from "@/lib/market-data/providers/geckoterminal";
import { cached, clearCache } from "@/lib/market-data/cache";
import { ageShort, pct, priceUsd, usdCompact } from "@/lib/utils/format";
import type { PoolSummary } from "@/lib/market-data/types";

const pool = (over: Partial<PoolSummary> = {}): PoolSummary => ({
  id: "p", networkId: "eth", address: "0xpool", name: "A / WETH", dex: "uniswap", createdAt: new Date(Date.now() - 3_600_000).toISOString(),
  baseToken: { networkId: "eth", address: "0xa", name: "A", symbol: "A", imageUrl: null, decimals: 18, coingeckoId: null }, quoteToken: null,
  priceUsd: 1, liquidityUsd: 100_000, fdvUsd: null, marketCapUsd: null,
  volumeUsd: { m5: null, h1: 5_000, h6: null, h24: 24_000 }, change: { m5: null, h1: null, h6: null, h24: 10 },
  txns24h: { buys: 100, sells: 90 }, txns1h: null, source: "geckoterminal", observedAt: new Date().toISOString(), ...over,
});

describe("addresses", () => {
  it("classifies formats and never treats Bitcoin as an EVM contract", () => {
    expect(classifyAddress("0x" + "a".repeat(40))).toBe("evm");
    expect(classifyAddress("So11111111111111111111111111111111111111112")).toBe("solana");
    expect(classifyAddress("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq")).toBe("bitcoin");
    expect(classifyAddress("not an address")).toBe("unknown");
  });
  it("lowercases EVM only; Solana stays case sensitive", () => {
    expect(normalizeAddress("0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD")).toBe("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd");
    expect(sameAddress("So11111111111111111111111111111111111111112", "so11111111111111111111111111111111111111112")).toBe(false);
  });
});

describe("ranking", () => {
  it("does not let a thin pumping pool outrank a liquid active market", () => {
    const thin = organicScore(pool({ liquidityUsd: 6_000, volumeUsd: { m5: null, h1: null, h6: null, h24: 2_000 }, change: { m5: null, h1: null, h6: null, h24: 5000 }, txns24h: { buys: 12, sells: 1 } }));
    const solid = organicScore(pool({ liquidityUsd: 3_000_000, volumeUsd: { m5: null, h1: null, h6: null, h24: 2_000_000 }, change: { m5: null, h1: null, h6: null, h24: 8 }, txns24h: { buys: 4000, sells: 3800 } }));
    expect(solid.score).toBeGreaterThan(thin.score);
  });
  it("flags heating up only with real volume acceleration and liquidity", () => {
    expect(heatingUp([pool({ volumeUsd: { m5: null, h1: 5_000, h6: null, h24: 24_000 } })])).toHaveLength(1);
    expect(heatingUp([pool({ volumeUsd: { m5: null, h1: 1_000, h6: null, h24: 24_000 } })])).toHaveLength(0);
    expect(heatingUp([pool({ liquidityUsd: 500 })])).toHaveLength(0);
    expect(heatingUp([pool({ volumeUsd: { m5: null, h1: null, h6: null, h24: null } })])).toHaveLength(0);
  });
  it("collapses pools of one token into its deepest pool", () => {
    const r = dedupeByToken([pool({ liquidityUsd: 1 }), pool({ id: "q", liquidityUsd: 9 })]);
    expect(r).toHaveLength(1);
    expect(r[0]?.id).toBe("q");
  });
});

describe("normalizePools", () => {
  it("handles missing numeric fields as null, not zero", () => {
    const out = normalizePools({
      data: [{ id: "eth_0xpool", type: "pool", attributes: { address: "0xpool", name: "X / Y", base_token_price_usd: null }, relationships: { base_token: { data: { id: "eth_0xa", type: "token" } }, network: { data: { id: "eth", type: "network" } } } }],
      included: [{ id: "eth_0xa", type: "token", attributes: { address: "0xa", name: "A", symbol: "A", image_url: "http://insecure/x.png" } }],
    });
    expect(out[0]?.priceUsd).toBeNull();
    expect(out[0]?.liquidityUsd).toBeNull();
    expect(out[0]?.baseToken.imageUrl).toBeNull();
  });
});

describe("cache", () => {
  it("dedupes concurrent loads and serves stale on error", async () => {
    clearCache();
    let calls = 0;
    const load = async () => { calls++; return calls; };
    const [a, b] = await Promise.all([cached("k", 1000, load), cached("k", 1000, load)]);
    expect(a.value).toBe(b.value);
    expect(calls).toBe(1);
    clearCache();
    await cached("s", 1, async () => "v", { staleMs: 60_000 });
    await new Promise((r) => setTimeout(r, 5));
    const res = await cached("s", 1, async () => { throw new Error("down"); }, { staleMs: 60_000 });
    expect(res).toEqual({ value: "v", stale: true });
  });
});

describe("format", () => {
  it("formats compactly and shows a dash for missing data", () => {
    expect(usdCompact(1450)).toBe("$1.45K");
    expect(usdCompact(2_800_000)).toBe("$2.8M");
    expect(usdCompact(1_250_000_000)).toBe("$1.25B");
    expect(usdCompact(null)).toBe("—");
    expect(pct(5)).toBe("+5.0%");
    expect(pct(undefined)).toBe("—");
    expect(priceUsd(0.000383354)).toBe("$0.000383");
    expect(ageShort(new Date(Date.now() - 7_200_000).toISOString())).toBe("2h");
  });
});
