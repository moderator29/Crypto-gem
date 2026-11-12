import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { describeItem, itemFromQuery, parseItem, type CheckoutItem } from "@/lib/checkout/items";
import { checkoutRng, createQuote } from "@/lib/checkout/quote";
import { signToken, verifyToken } from "@/lib/checkout/token";
import { checkoutReceiptNumber, readQuote, readReceipt, verifyCheckout } from "@/lib/checkout/verify";
import { staticBoostedProjects } from "@/lib/ads/boosted";
import { staticCampaigns } from "@/lib/ads/delivery";
import { BOOST_PACKS, PLACEMENTS } from "@/lib/ads/catalog";
import { EVM_ADDRESS, SOLANA_ADDRESS, getDirectMethod } from "@/lib/payments/direct/methods";
import { clearRateCache } from "@/lib/payments/direct/price";
import { TRANSFER_TOPIC, decimalToUnits } from "@/lib/payments/direct/units";
import type { VerifyResponse } from "@/lib/checkout/types";

const SECRET = "test-secret-that-is-long-enough-0123456789";
const EVM_HASH = `0x${"ab".repeat(32)}`;
const SOL_SIG = "5".repeat(88);
const hex = (n: number | bigint) => `0x${n.toString(16)}`;
const nowSec = () => Math.floor(Date.now() / 1000);

const boost: CheckoutItem = { kind: "boost", packId: "spark", network: "solana", address: "So11111111111111111111111111111111111111112", name: "Gem", symbol: "GEM" };

interface Chain {
  chainId: string;
  tx: unknown;
  receipt: unknown;
  latest: string;
  blockTime: number;
  solana: unknown;
}
let chain: Chain;
let telegramCalls: string[];

function erc20Receipt(token: string, units: bigint, block = 100) {
  return {
    status: "0x1",
    blockNumber: hex(block),
    logs: [{ address: token, topics: [TRANSFER_TOPIC, `0x${"0".repeat(24)}${"1".repeat(40)}`, `0x${"0".repeat(24)}${EVM_ADDRESS.slice(2).toLowerCase()}`], data: hex(units) }],
  };
}

function solanaTx(units: bigint, blockTime = nowSec()) {
  const mint = getDirectMethod("usdc-solana")?.token as string;
  return {
    blockTime,
    meta: {
      err: null,
      preTokenBalances: [{ owner: SOLANA_ADDRESS, mint, uiTokenAmount: { amount: "1000" } }],
      postTokenBalances: [{ owner: SOLANA_ADDRESS, mint, uiTokenAmount: { amount: (1000n + units).toString() } }],
    },
  };
}

const isPaid = (r: VerifyResponse | { error: string }): r is VerifyResponse => !("error" in r);

beforeEach(() => {
  clearRateCache();
  telegramCalls = [];
  chain = { chainId: "0x2105", tx: null, receipt: null, latest: hex(110), blockTime: nowSec(), solana: null };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: { body?: string }) => {
      if (String(url).includes("api.telegram.org")) {
        telegramCalls.push(init?.body ?? "");
        return new Response("{}", { status: 200 });
      }
      if (String(url).includes("simple/price")) return new Response(JSON.stringify({ ethereum: { usd: 2000 }, binancecoin: { usd: 600 } }), { status: 200 });
      const { method } = JSON.parse(init?.body ?? "{}") as { method: string };
      const results: Record<string, unknown> = {
        eth_chainId: chain.chainId,
        eth_getTransactionByHash: chain.tx,
        eth_getTransactionReceipt: chain.receipt,
        eth_blockNumber: chain.latest,
        eth_getBlockByNumber: { timestamp: hex(chain.blockTime) },
        getTransaction: chain.solana,
      };
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: results[method] ?? null }), { status: 200 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_ADMIN_CHAT_ID;
});

describe("checkout tokens", () => {
  it("signs and verifies a payload", () => {
    const t = signToken({ a: 1, b: "x" }, SECRET);
    expect(verifyToken(t, SECRET)).toEqual({ a: 1, b: "x" });
  });
  it("rejects tampering, a wrong secret and junk", () => {
    const t = signToken({ priceUsd: 100 }, SECRET);
    const [body, sig] = t.split(".") as [string, string];
    const forged = Buffer.from(JSON.stringify({ priceUsd: 1 })).toString("base64url");
    expect(verifyToken(`${forged}.${sig}`, SECRET)).toBeNull();
    expect(verifyToken(`${body}.${sig.slice(0, -2)}AA`, SECRET)).toBeNull();
    expect(verifyToken(t, `${SECRET}-other`)).toBeNull();
    expect(verifyToken("not-a-token", SECRET)).toBeNull();
    expect(verifyToken(`${body}.${sig}.x`, SECRET)).toBeNull();
  });
  it("keeps quote and receipt tokens apart", async () => {
    const q = await createQuote("usdc-base", boost, SECRET);
    expect(readQuote(q.token, SECRET)).not.toBeNull();
    expect(readReceipt(q.token, SECRET)).toBeNull();
  });
});

describe("items and prices", () => {
  it("takes the price from the catalog and ignores a client price", async () => {
    const parsed = parseItem({ ...boost, packId: "rocket", priceUsd: 1 });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const q = await createQuote("usdt-bsc", parsed.item, SECRET);
    const pack = BOOST_PACKS.find((p) => p.id === "rocket")!;
    expect(readQuote(q.token, SECRET)?.priceUsd).toBe(pack.priceUsd);
    expect(Math.floor(Number(q.amount))).toBe(pack.priceUsd);
    const hero = PLACEMENTS.find((p) => p.id === "hero")!;
    const today = new Date().toISOString().slice(0, 10);
    expect(describeItem({ kind: "banner", placementId: "hero", days: 3, startDate: today, name: "Ad", url: "https://example.com/" }).priceUsd).toBe(hero.prices[3]);
  });
  it("validates input", () => {
    expect(parseItem({ ...boost, packId: "free" }).ok).toBe(false);
    expect(parseItem({ ...boost, network: "ethereum" }).ok).toBe(false);
    expect(parseItem({ kind: "banner", placementId: "hero", days: 3, startDate: "2030-01-01", name: "Ad", url: "http://example.com" }).ok).toBe(false);
    expect(parseItem({ kind: "banner", placementId: "hero", days: 14, startDate: "2030-01-01", name: "Ad", url: "https://example.com" }).ok).toBe(false);
    const r = parseItem({ kind: "listing", packageId: "pro", name: "Gem\u0007 Coin", symbol: "GEM", telegram: "https://t.me/gemcoin" });
    expect(r.ok && r.item.kind === "listing" && r.item.name === "Gem Coin" && r.item.telegram === "gemcoin").toBe(true);
    expect(itemFromQuery({ kind: "banner", placement: "hero", days: "3", start: "2000-01-01", name: "Ad", url: "https://a.io" }).error).toMatch(/past/);
  });
  it("gives each quote its own fingerprinted amount", async () => {
    const ks = [17, 4242, 5, 9000];
    vi.spyOn(checkoutRng, "fingerprint").mockImplementation(() => ks.shift() ?? 1);
    const a = await createQuote("usdc-base", boost, SECRET);
    const b = await createQuote("usdc-base", boost, SECRET);
    expect(a.amount).toBe("100.0017");
    expect(b.amount).toBe("100.4242");
    const n1 = await createQuote("eth-base", boost, SECRET);
    const n2 = await createQuote("eth-base", boost, SECRET);
    expect(n1.amount).not.toBe(n2.amount);
    expect(n1.rate).toBe(2000);
    expect(Date.parse(n1.expiresAt) - Date.now()).toBeLessThanOrEqual(20 * 60_000);
    expect(Date.parse(a.expiresAt) - Date.now()).toBeGreaterThan(50 * 60_000);
  });
});

describe("verify", () => {
  it("accepts an exact EVM transfer once confirmed and signs a receipt", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    process.env.TELEGRAM_ADMIN_CHAT_ID = "42";
    const q = await createQuote("usdc-base", boost, SECRET);
    const m = getDirectMethod("usdc-base")!;
    chain.tx = { to: m.token, value: "0x0", blockNumber: hex(100) };
    chain.receipt = erc20Receipt(m.token as string, decimalToUnits(q.amount, 6));

    chain.latest = hex(101);
    const waiting = await verifyCheckout(q.token, EVM_HASH, SECRET);
    expect(isPaid(waiting) && waiting.status).toBe("confirming");

    chain.latest = hex(110);
    const res = await verifyCheckout(q.token, EVM_HASH, SECRET);
    expect(isPaid(res) && res.status).toBe("paid");
    if (!isPaid(res) || !res.receipt) throw new Error("no receipt");
    expect(res.receipt.number).toBe(checkoutReceiptNumber(EVM_HASH, new Date(chain.blockTime * 1000)));
    expect(res.receipt.number).toMatch(/^CG-\d{8}-[0-9A-F]{6}$/);
    expect(readReceipt(res.receipt.token, SECRET)?.received).toBe(q.amount);
    expect(telegramCalls).toHaveLength(1);
    expect(telegramCalls[0]).toContain(res.receipt.number);

    const again = await verifyCheckout(q.token, EVM_HASH, SECRET);
    expect(isPaid(again) && again.receipt?.number).toBe(res.receipt.number);
    expect(telegramCalls).toHaveLength(1);
  });

  it("accepts an exact Solana USDC transfer", async () => {
    const q = await createQuote("usdc-solana", boost, SECRET);
    chain.solana = solanaTx(decimalToUnits(q.amount, 6));
    const res = await verifyCheckout(q.token, SOL_SIG, SECRET);
    expect(isPaid(res) && res.status).toBe("paid");
    expect(isPaid(res) && res.receipt?.txHash).toBe(SOL_SIG);
  });

  it("rejects a wrong amount, including one that only matches another order loosely", async () => {
    vi.spyOn(checkoutRng, "fingerprint").mockReturnValue(100);
    const q = await createQuote("usdc-solana", boost, SECRET);
    chain.solana = solanaTx(decimalToUnits("99.5", 6));
    const short = await verifyCheckout(q.token, SOL_SIG, SECRET);
    expect(isPaid(short) && short.status).toBe("rejected");
    chain.solana = solanaTx(decimalToUnits(q.amount, 6) + decimalToUnits("0.1", 6));
    const loose = await verifyCheckout(q.token, SOL_SIG, SECRET);
    expect(isPaid(loose) && loose.status).toBe("rejected");
  });

  it("rejects an expired quote and a late transaction", async () => {
    const created = new Date(Date.now() - 3 * 60 * 60_000);
    const q = await createQuote("usdc-base", boost, SECRET, created);
    const pending = await verifyCheckout(q.token, EVM_HASH, SECRET);
    expect(isPaid(pending) && pending.status).toBe("rejected");

    const m = getDirectMethod("usdc-base")!;
    chain.tx = { to: m.token, value: "0x0", blockNumber: hex(100) };
    chain.receipt = erc20Receipt(m.token as string, decimalToUnits(q.amount, 6));
    chain.blockTime = nowSec();
    const late = await verifyCheckout(q.token, EVM_HASH, SECRET);
    expect(isPaid(late) && late.status).toBe("rejected");
    expect(isPaid(late) && late.message).toMatch(/after this quote expired/);

    const old = await createQuote("usdc-base", boost, SECRET, new Date(Date.now() - 8 * 24 * 60 * 60_000));
    const stale = await verifyCheckout(old.token, EVM_HASH, SECRET);
    expect(isPaid(stale) && stale.status).toBe("rejected");
  });

  it("rejects a tampered token and a malformed hash", async () => {
    const q = await createQuote("usdc-base", boost, SECRET);
    const bad = await verifyCheckout(`${q.token}x`, EVM_HASH, SECRET);
    expect("error" in bad).toBe(true);
    const fmt = await verifyCheckout(q.token, "0x1234", SECRET);
    expect(isPaid(fmt) && fmt.status).toBe("rejected");
  });

  it("keeps working when Telegram fails", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    process.env.TELEGRAM_ADMIN_CHAT_ID = "42";
    const base = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => (String(url).includes("telegram") ? Promise.reject(new Error("down")) : base(url, init as never))));
    const q = await createQuote("usdc-solana", boost, SECRET);
    chain.solana = solanaTx(decimalToUnits(q.amount, 6));
    const res = await verifyCheckout(q.token, SOL_SIG, SECRET);
    expect(isPaid(res) && res.status).toBe("paid");
  });
});

describe("static sponsored lists", () => {
  it("only shows entries that have not ended", () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    const past = new Date(Date.now() - 3600_000).toISOString();
    const boosts = staticBoostedProjects([
      { network: "solana", address: "So11111111111111111111111111111111111111112", name: "A", symbol: "A", packId: "spark", endsAt: future },
      { network: "base", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", name: "B", symbol: "B", packId: "moon", endsAt: future },
      { network: "base", address: "0x0000000000000000000000000000000000000001", name: "C", symbol: "C", packId: "moon", endsAt: past },
    ]);
    expect(boosts.map((b) => b.name)).toEqual(["B", "A"]);
    const banners = staticCampaigns("hero", new Date(), [
      { id: "x", name: "X", image: "/x.webp", url: "https://x.io", endsAt: future },
      { id: "y", name: "Y", image: "/y.webp", url: "https://y.io", endsAt: past },
      { id: "z", name: "Z", image: "/z.webp", url: "https://z.io", endsAt: future, placement: "side" },
    ]);
    expect(banners.map((b) => b.id)).toEqual(["x"]);
    expect(banners[0]?.url).toBe("https://x.io");
  });
});
