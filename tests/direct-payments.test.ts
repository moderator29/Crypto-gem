import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createIntent, refreshPayment, submitProof, type PaymentRow } from "@/lib/payments/direct/service";
import { clearRateCache } from "@/lib/payments/direct/price";
import { EVM_ADDRESS, SOLANA_ADDRESS, getDirectMethod } from "@/lib/payments/direct/methods";
import {
  TRANSFER_TOPIC, decimalToUnits, isEvmHash, isSolanaSignature, nativeAmount, parseErc20Transfers, parseSolanaTokenDelta, receiptNumber, stableAmount, unitsToDecimal, withinTolerance,
} from "@/lib/payments/direct/units";

type Row = Record<string, unknown>;
const tables = {} as Record<"orders" | "payments" | "payment_proofs" | "notifications" | "token_submissions", Row[]> & Record<string, Row[]>;

/** In-memory stand-in for the query builder paths the direct payment code uses, including the unique indexes. */
function fakeDb() {
  const from = (name: string) => {
    const filters: Array<(r: Row) => boolean> = [];
    let op: "select" | "update" | "insert" = "select";
    let patchRow: Row = {};
    let inserted: Row | null = null;
    let returning = false;
    const rows = () => (tables[name] ??= []);
    const match = () => rows().filter((r) => filters.every((f) => f(r)));
    const lowerHash = (r: Row) => (typeof r.tx_hash === "string" ? r.tx_hash.toLowerCase() : null);
    const run = (): { data: unknown; error: { code: string } | null } => {
      if (op === "insert") {
        const row = { ...(inserted as Row) };
        if (name === "payment_proofs" && rows().some((r) => r.tx_hash === row.tx_hash)) return { data: null, error: { code: "23505" } };
        if (name === "payments") {
          if (row.tx_hash && rows().some((r) => lowerHash(r) === lowerHash(row))) return { data: null, error: { code: "23505" } };
          if (rows().some((r) => r.order_id === row.order_id && r.pay_currency === row.pay_currency && ["created", "waiting", "confirming", "partially_paid"].includes(r.status as string))) return { data: null, error: { code: "23505" } };
          row.id = crypto.randomUUID();
          row.created_at = new Date().toISOString();
          row.confirmations = 0;
          row.tx_hash ??= null;
        }
        rows().push(row);
        return { data: row, error: null };
      }
      if (op === "update") {
        const hit = match();
        if (name === "payments" && typeof patchRow.tx_hash === "string") {
          const h = patchRow.tx_hash.toLowerCase();
          if (rows().some((r) => lowerHash(r) === h && !hit.includes(r))) return { data: null, error: { code: "23505" } };
        }
        hit.forEach((r) => Object.assign(r, patchRow));
        return { data: returning ? hit : null, error: null };
      }
      return { data: match(), error: null };
    };
    const q = {
      select: () => {
        returning = true;
        return q;
      },
      eq: (k: string, v: unknown) => (filters.push((r) => r[k] === v), q),
      neq: (k: string, v: unknown) => (filters.push((r) => r[k] !== v), q),
      in: (k: string, v: unknown[]) => (filters.push((r) => v.includes(r[k])), q),
      is: (k: string, v: unknown) => (filters.push((r) => (r[k] ?? null) === v), q),
      update: (p: Row) => ((op = "update"), (patchRow = p), q),
      insert: (row: Row) => ((op = "insert"), (inserted = row), q),
      maybeSingle: async () => {
        const r = run();
        return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
      },
      single: async () => {
        const r = run();
        return { data: r.data, error: r.error };
      },
      then: (resolve: (v: unknown) => void) => resolve(run()),
    };
    return q;
  };
  return { from } as unknown as SupabaseClient;
}

const USER = "did:privy:buyer";
const ORDER = "11111111-1111-1111-1111-111111111111";
const HASH = `0x${"ab".repeat(32)}`;
const HASH2 = `0x${"cd".repeat(32)}`;
const SIG = "5".repeat(88);
const OTHER = "0x1111111111111111111111111111111111111111";
const pad = (a: string) => `0x${"0".repeat(24)}${a.slice(2).toLowerCase()}`;
const hex = (n: bigint | number) => `0x${BigInt(n).toString(16)}`;
const nowSec = () => Math.floor(Date.now() / 1000);

interface Chain {
  chainId: string;
  tx: Row | null;
  receipt: Row | null;
  latest: string;
  blockTime: number;
  solana: Row | null;
  price: number | null;
}
let chain: Chain;

function transferLog(token: string, to: string, amount: bigint) {
  return { address: token, topics: [TRANSFER_TOPIC, pad(OTHER), pad(to)], data: hex(amount) };
}

function evmChain(opts: { to?: string; value?: bigint; logs?: Row[]; status?: string; blockNumber?: number; latest?: number }) {
  const bn = hex(opts.blockNumber ?? 100);
  chain.tx = { to: opts.to ?? EVM_ADDRESS, value: hex(opts.value ?? 0n), blockNumber: bn };
  chain.receipt = { status: opts.status ?? "0x1", blockNumber: bn, logs: opts.logs ?? [] };
  chain.latest = hex(opts.latest ?? 110);
}

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  clearRateCache();
  chain = { chainId: "0x1", tx: null, receipt: null, latest: "0x0", blockTime: nowSec(), solana: null, price: 2000 };
  tables.orders = [{ id: ORDER, user_id: USER, kind: "listing", ref_id: "sub-1", price_usd: 100, status: "pending", created_at: new Date().toISOString() }];
  tables.token_submissions = [{ id: "sub-1", status: "awaiting_payment" }];
  tables.payments = [];
  tables.payment_proofs = [];
  tables.notifications = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: { body?: string }) => {
    if (String(url).includes("simple/price")) {
      return new Response(JSON.stringify(chain.price === null ? {} : { ethereum: { usd: chain.price }, binancecoin: { usd: 600 } }), { status: 200 });
    }
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
  }));
});

describe("amount helpers", () => {
  it("converts decimals to base units exactly and back", () => {
    expect(decimalToUnits("100", 6)).toBe(100_000000n);
    expect(decimalToUnits("0.000001", 6)).toBe(1n);
    expect(decimalToUnits("100.5", 18)).toBe(100_500000000000000000n);
    expect(unitsToDecimal(100_500000000000000000n, 18)).toBe("100.5");
    expect(unitsToDecimal(1n, 6)).toBe("0.000001");
    expect(unitsToDecimal(5_000000n, 6)).toBe("5");
    expect(() => decimalToUnits("1.0000001", 6)).toThrow();
    expect(() => decimalToUnits("-1", 6)).toThrow();
    expect(() => decimalToUnits("1e3", 6)).toThrow();
  });
  it("applies a 0.5 percent tolerance", () => {
    expect(withinTolerance(100_000000n, 100_000000n)).toBe(true);
    expect(withinTolerance(99_500000n, 100_000000n)).toBe(true);
    expect(withinTolerance(99_499999n, 100_000000n)).toBe(false);
  });
  it("rounds native quotes up with a 1.5 percent buffer", () => {
    expect(nativeAmount(100, 2000)).toBe("0.05075");
    expect(Number(nativeAmount(100, 3000))).toBeGreaterThanOrEqual((100 / 3000) * 1.015);
    expect(stableAmount(99.5)).toBe("99.5");
    expect(stableAmount(100)).toBe("100");
  });
  it("builds receipt numbers and validates hash formats", () => {
    expect(receiptNumber("abcdef12-0000-0000-0000-000000000000", new Date("2026-11-12T23:59:00Z"))).toBe("CG-20261112-ABCDEF");
    expect(isEvmHash(HASH)).toBe(true);
    expect(isEvmHash("0x1234")).toBe(false);
    expect(isSolanaSignature(SIG)).toBe(true);
    expect(isSolanaSignature("short")).toBe(false);
    expect(isSolanaSignature("0".repeat(88))).toBe(false);
  });
});

describe("log and balance parsing", () => {
  const usdt = getDirectMethod("usdt-ethereum")!;
  const bscUsdt = getDirectMethod("usdt-bsc")!;
  it("sums a USDT 6-decimal transfer to us", () => {
    expect(parseErc20Transfers([transferLog(usdt.token!, EVM_ADDRESS, 100_000000n)], usdt.token!, EVM_ADDRESS)).toBe(100_000000n);
  });
  it("reads a BSC 18-decimal transfer", () => {
    const amount = decimalToUnits("100", 18);
    expect(parseErc20Transfers([transferLog(bscUsdt.token!, EVM_ADDRESS, amount)], bscUsdt.token!, EVM_ADDRESS)).toBe(amount);
  });
  it("ignores the wrong recipient, the wrong token and NFT style transfers", () => {
    expect(parseErc20Transfers([transferLog(usdt.token!, OTHER, 100_000000n)], usdt.token!, EVM_ADDRESS)).toBe(0n);
    expect(parseErc20Transfers([transferLog(bscUsdt.token!, EVM_ADDRESS, 100_000000n)], usdt.token!, EVM_ADDRESS)).toBe(0n);
    const nft = { ...transferLog(usdt.token!, EVM_ADDRESS, 1n), topics: [TRANSFER_TOPIC, pad(OTHER), pad(EVM_ADDRESS), hex(7)] };
    expect(parseErc20Transfers([nft], usdt.token!, EVM_ADDRESS)).toBe(0n);
  });
  it("computes the Solana token delta from pre and post balances", () => {
    const mint = getDirectMethod("usdc-solana")!.token!;
    const meta = {
      preTokenBalances: [{ owner: SOLANA_ADDRESS, mint, uiTokenAmount: { amount: "5000000" } }, { owner: "Someone", mint, uiTokenAmount: { amount: "9" } }],
      postTokenBalances: [{ owner: SOLANA_ADDRESS, mint, uiTokenAmount: { amount: "105000000" } }],
    };
    expect(parseSolanaTokenDelta(meta, SOLANA_ADDRESS, mint)).toBe(100_000000n);
    expect(parseSolanaTokenDelta(meta, "Other", mint)).toBe(0n);
    expect(parseSolanaTokenDelta(meta, SOLANA_ADDRESS, "OtherMint")).toBe(0n);
    expect(parseSolanaTokenDelta({ postTokenBalances: meta.postTokenBalances }, SOLANA_ADDRESS, mint)).toBe(105_000000n);
  });
});

describe("intents", () => {
  it("quotes stablecoins at the order price and is idempotent per method", async () => {
    const db = fakeDb();
    const a = await createIntent(db, USER, ORDER, "usdt-ethereum");
    expect(a).toMatchObject({ amount: "100", amountUsd: 100, rate: null, address: EVM_ADDRESS, status: "waiting", minConfirmations: 3 });
    const b = await createIntent(db, USER, ORDER, "usdt-ethereum");
    expect(b.paymentId).toBe(a.paymentId);
    expect(tables.payments).toHaveLength(1);
  });
  it("expires the previous waiting intent when the method changes", async () => {
    const db = fakeDb();
    const a = await createIntent(db, USER, ORDER, "usdt-ethereum");
    const b = await createIntent(db, USER, ORDER, "usdc-base");
    expect(b.paymentId).not.toBe(a.paymentId);
    expect(tables.payments.find((p) => p.id === a.paymentId)?.status).toBe("expired");
  });
  it("prices native coins from the quote with a buffer and records the rate", async () => {
    const db = fakeDb();
    const i = await createIntent(db, USER, ORDER, "eth-base");
    expect(i.amount).toBe("0.05075");
    expect(i.rate).toBe(2000);
    expect(Date.parse(i.expiresAt) - Date.now()).toBeLessThanOrEqual(20 * 60_000);
  });
  it("refuses native quotes when no live price exists", async () => {
    chain.price = null;
    await expect(createIntent(fakeDb(), USER, ORDER, "eth-base")).rejects.toMatchObject({ status: 503 });
  });
  it("hides other users' orders and unknown methods and paid orders", async () => {
    const db = fakeDb();
    await expect(createIntent(db, "did:privy:other", ORDER, "usdt-ethereum")).rejects.toMatchObject({ status: 404 });
    await expect(createIntent(db, USER, ORDER, "doge")).rejects.toMatchObject({ status: 400 });
    tables.orders[0]!.status = "paid";
    await expect(createIntent(db, USER, ORDER, "usdt-ethereum")).rejects.toMatchObject({ status: 409 });
  });
});

describe("verify and settle", () => {
  async function intent(method = "usdt-ethereum") {
    const db = fakeDb();
    const i = await createIntent(db, USER, ORDER, method);
    return { db, id: i.paymentId };
  }

  it("settles a full ERC-20 payment exactly once and writes the receipt", async () => {
    const { db, id } = await intent();
    const m = getDirectMethod("usdt-ethereum")!;
    evmChain({ logs: [transferLog(m.token!, EVM_ADDRESS, 100_000000n)] });
    const v = await submitProof(db, USER, id, HASH.toUpperCase().replace("0X", "0x"));
    expect(v).toMatchObject({ status: "finished", paidAmount: "100", orderId: ORDER });
    expect(v.receiptNo).toMatch(/^CG-\d{8}-[0-9A-F]{6}$/);
    expect(tables.orders[0]!.status).toBe("paid");
    expect(tables.token_submissions[0]!.status).toBe("pending_review");
    expect(tables.notifications).toHaveLength(1);
    expect(tables.notifications[0]!).toMatchObject({ title: "Payment confirmed", href: `/receipt/${ORDER}` });
    const row = tables.payments[0]! as unknown as PaymentRow;
    await refreshPayment(db, { ...row, status: "waiting" }, { force: true });
    expect(tables.notifications).toHaveLength(1);
  });

  it("settles a BSC 18-decimal transfer and a native ETH transfer", async () => {
    let { db, id } = await intent("usdt-bsc");
    chain.chainId = "0x38";
    evmChain({ logs: [transferLog(getDirectMethod("usdt-bsc")!.token!, EVM_ADDRESS, decimalToUnits("100", 18))], latest: 120 });
    expect((await submitProof(db, USER, id, HASH)).status).toBe("finished");

    for (const k of Object.keys(tables)) delete tables[k];
    tables.orders = [{ id: ORDER, user_id: USER, kind: "listing", ref_id: "sub-1", price_usd: 100, status: "pending" }];
    tables.token_submissions = [{ id: "sub-1", status: "awaiting_payment" }];
    ({ db, id } = await intent("eth-ethereum"));
    chain.chainId = "0x1";
    evmChain({ value: decimalToUnits("0.05075", 18) });
    expect((await submitProof(db, USER, id, HASH2)).status).toBe("finished");
  });

  it("waits for confirmations before counting a valid transfer", async () => {
    const { db, id } = await intent();
    evmChain({ logs: [transferLog(getDirectMethod("usdt-ethereum")!.token!, EVM_ADDRESS, 100_000000n)], blockNumber: 100, latest: 101 });
    const v = await submitProof(db, USER, id, HASH);
    expect(v).toMatchObject({ status: "confirming", confirmations: 2, required: 3 });
    expect(tables.orders[0]!.status).toBe("pending");
    expect(tables.payment_proofs).toHaveLength(0);
  });

  it("rejects the wrong recipient, the wrong token and a failed transaction", async () => {
    const { db, id } = await intent();
    const m = getDirectMethod("usdt-ethereum")!;
    evmChain({ logs: [transferLog(m.token!, OTHER, 100_000000n)] });
    const a = await submitProof(db, USER, id, HASH);
    expect(a.rejected).toBe(true);
    expect(a.txHash).toBeNull();
    evmChain({ logs: [transferLog(getDirectMethod("usdc-ethereum")!.token!, EVM_ADDRESS, 100_000000n)] });
    expect((await submitProof(db, USER, id, HASH2)).rejected).toBe(true);
    evmChain({ logs: [transferLog(m.token!, EVM_ADDRESS, 100_000000n)], status: "0x0" });
    expect((await submitProof(db, USER, id, HASH)).rejected).toBe(true);
    expect(tables.orders[0]!.status).toBe("pending");
  });

  it("rejects a native transfer sent to a different address and a transfer from before the intent", async () => {
    const { db, id } = await intent("eth-ethereum");
    evmChain({ to: OTHER, value: decimalToUnits("1", 18) });
    expect((await submitProof(db, USER, id, HASH)).rejected).toBe(true);
    evmChain({ value: decimalToUnits("1", 18) });
    chain.blockTime = nowSec() - 3 * 3600;
    expect((await submitProof(db, USER, id, HASH)).rejected).toBe(true);
    expect(tables.orders[0]!.status).toBe("pending");
  });

  it("handles a short payment, then completes it with a second hash", async () => {
    const { db, id } = await intent();
    const m = getDirectMethod("usdt-ethereum")!;
    evmChain({ logs: [transferLog(m.token!, EVM_ADDRESS, 60_000000n)] });
    const first = await submitProof(db, USER, id, HASH);
    expect(first.status).toBe("waiting");
    expect(first.message).toBe("Received 60 of 100. Send the remaining amount and submit that hash too");
    expect(tables.payments[0]!.status).toBe("partially_paid");
    expect(tables.orders[0]!.status).toBe("pending");
    evmChain({ logs: [transferLog(m.token!, EVM_ADDRESS, 40_000000n)] });
    const second = await submitProof(db, USER, id, HASH2);
    expect(second.status).toBe("finished");
    expect(second.paidAmount).toBe("100");
    expect(tables.orders[0]!.status).toBe("paid");
  });

  it("accepts a payment within the 0.5 percent tolerance", async () => {
    const { db, id } = await intent();
    evmChain({ logs: [transferLog(getDirectMethod("usdt-ethereum")!.token!, EVM_ADDRESS, 99_600000n)] });
    expect((await submitProof(db, USER, id, HASH)).status).toBe("finished");
  });

  it("rejects a replayed hash on a second payment", async () => {
    const { db, id } = await intent();
    evmChain({ logs: [transferLog(getDirectMethod("usdt-ethereum")!.token!, EVM_ADDRESS, 100_000000n)] });
    expect((await submitProof(db, USER, id, HASH)).status).toBe("finished");
    tables.orders.push({ id: "22222222-2222-2222-2222-222222222222", user_id: USER, kind: "listing", ref_id: "sub-2", price_usd: 100, status: "pending" });
    const second = await createIntent(db, USER, "22222222-2222-2222-2222-222222222222", "usdt-ethereum");
    const r = await submitProof(db, USER, second.paymentId, HASH);
    expect(r.rejected).toBe(true);
    expect(r.message).toMatch(/already been used/);
    expect(tables.orders[1]!.status).toBe("pending");
  });

  it("expires a waiting intent with no proof and refuses a late submission", async () => {
    const { db, id } = await intent();
    tables.payments[0]!.expires_at = new Date(Date.now() - 1000).toISOString();
    const v = await refreshPayment(db, tables.payments[0]! as unknown as PaymentRow);
    expect(v.status).toBe("expired");
    evmChain({ logs: [transferLog(getDirectMethod("usdt-ethereum")!.token!, EVM_ADDRESS, 100_000000n)] });
    const r = await submitProof(db, USER, id, HASH);
    expect(r.rejected).toBe(true);
    expect(tables.orders[0]!.status).toBe("pending");
  });

  it("refuses to verify on an RPC that reports the wrong chain", async () => {
    const { db, id } = await intent();
    chain.chainId = "0x38";
    evmChain({ logs: [transferLog(getDirectMethod("usdt-ethereum")!.token!, EVM_ADDRESS, 100_000000n)] });
    const v = await submitProof(db, USER, id, HASH);
    expect(v.status).toBe("confirming");
    expect(tables.orders[0]!.status).toBe("pending");
  });

  it("rejects malformed hashes and other users' payments", async () => {
    const { db, id } = await intent();
    expect((await submitProof(db, USER, id, "0x12")).rejected).toBe(true);
    await expect(submitProof(db, "did:privy:other", id, HASH)).rejects.toMatchObject({ status: 404 });
  });

  it("settles a Solana USDC transfer from token balances", async () => {
    const { db, id } = await intent("usdc-solana");
    const mint = getDirectMethod("usdc-solana")!.token!;
    chain.solana = {
      blockTime: nowSec(),
      meta: {
        err: null,
        preTokenBalances: [{ owner: SOLANA_ADDRESS, mint, uiTokenAmount: { amount: "1000000" } }],
        postTokenBalances: [{ owner: SOLANA_ADDRESS, mint, uiTokenAmount: { amount: "101000000" } }],
      },
    };
    expect(await submitProof(db, USER, id, SIG)).toMatchObject({ status: "finished", paidAmount: "100" });
    expect(tables.orders[0]!.status).toBe("paid");
  });

  it("does not settle a failed Solana transaction", async () => {
    const { db, id } = await intent("usdc-solana");
    chain.solana = { blockTime: nowSec(), meta: { err: { InstructionError: [0, "Custom"] }, preTokenBalances: [], postTokenBalances: [] } };
    expect((await submitProof(db, USER, id, SIG)).rejected).toBe(true);
    expect(tables.orders[0]!.status).toBe("pending");
  });
});
