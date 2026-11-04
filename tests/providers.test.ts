import { describe, expect, it } from "vitest";
import { readRisk } from "@/lib/market-data/goplus";
import { dexscreener, networkFromDexScreener } from "@/lib/market-data/providers/dexscreener";
import { GET as quote } from "@/app/api/quote/route";

describe("goplus risk reading", () => {
  it("flags honeypots, high sell tax and unverified source", () => {
    const r = readRisk({ is_honeypot: "1", sell_tax: "0.25", is_open_source: "0", holder_count: "120" });
    expect(r.flags.map((f) => f.level)).toContain("high");
    expect(r.flags.some((f) => f.label.includes("Sell tax 25%"))).toBe(true);
    expect(r.flags.some((f) => f.label.includes("not verified"))).toBe(true);
    expect(r.holders).toBe(120);
  });
  it("reports nothing for a clean record", () => {
    expect(readRisk({ is_honeypot: "0", is_open_source: "1", buy_tax: "0", sell_tax: "0" }).flags).toEqual([]);
  });
});

describe("dexscreener mapping", () => {
  const pair = (liq: number, addr: string) => ({
    chainId: "solana", dexId: "raydium", pairAddress: `pair-${liq}`,
    baseToken: { address: addr, name: "Test", symbol: "TST" }, quoteToken: { address: "So111", name: "SOL", symbol: "SOL" },
    priceUsd: "0.5", liquidity: { usd: liq }, fdv: 1000, marketCap: 900, volume: { h24: 10 }, pairCreatedAt: 1_700_000_000_000,
    info: { imageUrl: "https://x/i.png", websites: [{ url: "https://t.io" }], socials: [{ type: "twitter", url: "https://x.com/t" }] },
  });
  it("merges pairs for one token and prefers the deepest pool", () => {
    const info = dexscreener.toInfo([pair(10, "AAA"), pair(500, "AAA")], "AAA", "solana");
    expect(info?.liquidityUsd).toBe(500);
    expect(info?.volume24hUsd).toBe(20);
    expect(info?.twitter).toBe("https://x.com/t");
  });
  it("returns null for a token on another network", () => {
    expect(dexscreener.toInfo([pair(10, "AAA")], "AAA", "base")).toBeNull();
  });
  it("maps chain ids", () => {
    expect(networkFromDexScreener("solana")).toBe("solana");
    expect(networkFromDexScreener("nonexistent-chain")).toBeNull();
  });
});

describe("quote route validation", () => {
  const call = (qs: string) => quote(new Request(`http://localhost/api/quote?${qs}`, { headers: { "x-forwarded-for": "9.9.9.9" } }));
  it("rejects non-Solana mints, bad amounts and unknown pay assets", async () => {
    expect((await call("mint=0xabc&pay=SOL&amount=1")).status).toBe(400);
    expect((await call("mint=So11111111111111111111111111111111111111112&pay=SOL&amount=-1")).status).toBe(400);
    expect((await call("mint=So11111111111111111111111111111111111111112&pay=DOGE&amount=1")).status).toBe(400);
    expect((await call("mint=So11111111111111111111111111111111111111112&pay=SOL&amount=999999999")).status).toBe(400);
  });
});
