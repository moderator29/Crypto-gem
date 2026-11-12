import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { verifyEvmTransfer } from "@/lib/payments/direct/evm";
import { EXPLORER_TX, getDirectMethod, type DirectMethod } from "@/lib/payments/direct/methods";
import { verifySolanaTransfer } from "@/lib/payments/direct/solana";
import type { TxCheck } from "@/lib/payments/direct/types";
import { classifyTransfer, decimalToUnits, isEvmHash, isSolanaSignature, unitsToDecimal } from "@/lib/payments/direct/units";
import { describeItem, parseItem } from "./items";
import { isStable, requiredConfirmations, type QuotePayload } from "./quote";
import { notifyAdmin } from "./telegram";
import { signToken, verifyToken } from "./token";
import type { ReceiptData, VerifyResponse } from "./types";

/** A transaction may be mined up to 10 minutes before the quote was made or after it expired. */
export const SLACK_MS = 10 * 60_000;
/** A quote token older than this is no longer accepted at all. */
export const MAX_TOKEN_AGE_MS = 7 * 24 * 60 * 60_000;

const quoteSchema = z.object({
  v: z.literal(1),
  typ: z.literal("quote"),
  kind: z.enum(["boost", "listing", "banner"]),
  item: z.unknown(),
  priceUsd: z.number().positive(),
  methodId: z.string(),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  rate: z.number().positive().nullable(),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  nonce: z.string().min(8),
});

const receiptSchema = z.object({
  v: z.literal(1),
  typ: z.literal("receipt"),
  number: z.string(),
  kind: z.enum(["boost", "listing", "banner"]),
  title: z.string(),
  lines: z.array(z.string()),
  priceUsd: z.number(),
  methodId: z.string(),
  asset: z.string(),
  networkId: z.string(),
  networkLabel: z.string(),
  amount: z.string(),
  received: z.string(),
  txHash: z.string(),
  explorerTxUrl: z.string(),
  toAddress: z.string(),
  quotedAt: z.string(),
  paidAt: z.string(),
});

/** A signed, well formed quote token, or null. */
export function readQuote(token: string, secret: string): QuotePayload | null {
  const parsed = quoteSchema.safeParse(verifyToken(token, secret));
  if (!parsed.success) return null;
  const item = parseItem(parsed.data.item);
  if (!item.ok || item.item.kind !== parsed.data.kind) return null;
  return { ...parsed.data, item: item.item };
}

/** A signed receipt token's data, or null. */
export function readReceipt(token: string, secret: string): ReceiptData | null {
  const parsed = receiptSchema.safeParse(verifyToken(token, secret));
  return parsed.success ? parsed.data : null;
}

/** EVM hashes are hex and compare case-insensitively; Solana signatures are base58 and stay as typed. */
export const normalizeTxHash = (m: DirectMethod, hash: string): string => (m.kind === "spl" ? hash.trim() : hash.trim().toLowerCase());

/** CG-YYYYMMDD-<first 6 hex of sha256(txHash) uppercase>. The same transaction always gets the same number. */
export function checkoutReceiptNumber(txHash: string, at: Date): string {
  const d = at.toISOString().slice(0, 10).replace(/-/g, "");
  return `CG-${d}-${createHash("sha256").update(txHash).digest("hex").slice(0, 6).toUpperCase()}`;
}

/**
 * The fingerprint check on top of classifyTransfer: the received amount must sit within the same small
 * band below and above the quoted amount (0.002 for stablecoins, 0.1% for native coins). classifyTransfer
 * alone allows a much larger overpayment, which would let one transfer match many different quotes.
 */
export function matchesFingerprint(received: bigint, target: bigint, m: DirectMethod): boolean {
  const band = isStable(m) ? decimalToUnits("0.002", m.decimals) : target / 1000n;
  const diff = received > target ? received - target : target - received;
  return diff <= band;
}

const result = (status: VerifyResponse["status"], message: string, confirmations = 0, required = 1): VerifyResponse => ({ status, confirmations, required, message });

/**
 * Checks a submitted transaction against a signed quote and, once it has enough confirmations,
 * returns a signed receipt.
 *
 * There is no database, so nothing remembers that a hash was already used. Re-verifying the same hash
 * with the same quote is harmless: it is the same order and yields the same receipt (the receipt number
 * is derived from the hash). Reusing one transfer for a different order is blocked by the amount
 * fingerprint: every quote carries its own random last digits, the transfer must match them closely,
 * and it must be mined inside that quote's time window. The admin alert shows the receipt number, so
 * a repeat is visible there too.
 */
export async function verifyCheckout(
  token: string,
  rawHash: string,
  secret: string,
  opts: { now?: Date; origin?: string | null } = {},
): Promise<VerifyResponse | { error: string; httpStatus: number }> {
  const now = opts.now ?? new Date();
  const quote = readQuote(token, secret);
  if (!quote) return { error: "This checkout link is invalid or was changed. Start a new checkout.", httpStatus: 400 };
  const m = getDirectMethod(quote.methodId);
  if (!m) return { error: "Unknown payment method", httpStatus: 400 };
  const required = requiredConfirmations(m);

  const createdMs = Date.parse(quote.createdAt);
  const expiresMs = Date.parse(quote.expiresAt);
  if (now.getTime() - createdMs > MAX_TOKEN_AGE_MS) return result("rejected", "This checkout expired. Start a new checkout, or message an admin if you already paid.", 0, required);

  const hash = rawHash.trim();
  const okFormat = m.kind === "spl" ? isSolanaSignature(hash) : isEvmHash(hash);
  if (!okFormat) {
    return result("rejected", m.kind === "spl" ? "That is not a Solana transaction signature." : "That is not a transaction hash. It should be 0x followed by 64 characters.", 0, required);
  }

  let check: TxCheck;
  try {
    const ctx = { notBefore: Math.floor((createdMs - SLACK_MS) / 1000) };
    check = m.kind === "spl" ? await verifySolanaTransfer(m, hash, ctx) : await verifyEvmTransfer(m, hash, ctx);
  } catch {
    return result("pending", "The network node is busy. We will check again shortly.", 0, required);
  }

  const lateCutoff = expiresMs + SLACK_MS;
  if (check.state === "not_found") {
    if (now.getTime() > lateCutoff) return result("rejected", "This quote expired before the transaction appeared on chain. Start a new checkout, or message an admin if you already paid.", 0, required);
    return result("pending", check.message, 0, required);
  }
  if (check.state === "rejected") return result("rejected", check.reason, 0, required);
  if (check.blockTime !== null && check.blockTime * 1000 > lateCutoff) {
    return result("rejected", "That transaction was sent after this quote expired. Message an admin with the hash and we will sort it out.", 0, required);
  }

  const target = decimalToUnits(quote.amount, m.decimals);
  const cls = classifyTransfer(check.receivedUnits, target, isStable(m) ? "stable" : "native", m.decimals);
  const got = unitsToDecimal(check.receivedUnits, m.decimals);
  if (cls === "short") return result("rejected", `That transfer sent ${got} ${m.asset}, less than the ${quote.amount} ${m.asset} this order needs. Message an admin to settle the difference.`, 0, required);
  if (cls === "over" || !matchesFingerprint(check.receivedUnits, target, m)) {
    return result("rejected", `That transfer sent ${got} ${m.asset}, which does not match this order's exact amount of ${quote.amount} ${m.asset}. Message an admin with the hash if you sent it for this order.`, 0, required);
  }

  if (check.confirmations < check.required) {
    return result("confirming", `Found it. Waiting for confirmations (${check.confirmations} of ${check.required}).`, check.confirmations, check.required);
  }

  const desc = describeItem(quote.item);
  const txHash = normalizeTxHash(m, hash);
  const paidAt = check.blockTime !== null ? new Date(check.blockTime * 1000) : new Date(createdMs);
  const receipt: ReceiptData = {
    v: 1,
    typ: "receipt",
    number: checkoutReceiptNumber(txHash, paidAt),
    kind: quote.kind,
    title: desc.title,
    lines: desc.lines,
    priceUsd: quote.priceUsd,
    methodId: m.id,
    asset: m.asset,
    networkId: m.networkId,
    networkLabel: m.networkLabel,
    amount: quote.amount,
    received: got,
    txHash,
    explorerTxUrl: `${EXPLORER_TX[m.networkId]}${txHash}`,
    toAddress: m.address,
    quotedAt: quote.createdAt,
    paidAt: paidAt.toISOString(),
  };
  await notifyAdmin(receipt, `${quote.nonce}:${txHash}`, opts.origin ?? null);
  return {
    status: "paid",
    confirmations: check.confirmations,
    required: check.required,
    message: "Payment verified. Thank you.",
    receipt: { ...receipt, token: signToken(receipt, secret) },
  };
}
