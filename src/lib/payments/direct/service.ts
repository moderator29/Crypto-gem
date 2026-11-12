import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyEvmTransfer } from "./evm";
import { DIRECT_METHODS, EXPLORER_ADDRESS, getDirectMethod, type DirectMethod } from "./methods";
import { usdRate } from "./price";
import { settlePayment } from "./settle";
import { verifySolanaTransfer } from "./solana";
import { PayError, type PaymentView, type PayStatus, type TxCheck } from "./types";
import { decimalToUnits, EVM_CONFIRMATIONS, isEvmHash, isSolanaSignature, nativeAmount, numberToDecimal, stableAmount, unitsToDecimal, withinTolerance } from "./units";

export const CHECK_INTERVAL_MS = 4000;
const STABLE_TTL_MS = 60 * 60_000;
const NATIVE_TTL_MS = 20 * 60_000;
const EARLY_SLACK_SEC = 10 * 60;
const LIVE = ["created", "waiting", "confirming", "partially_paid"];
const FINAL = ["finished", "failed", "expired", "refunded"];

export interface PaymentRow {
  id: string;
  order_id: string;
  provider: string;
  pay_currency: string;
  pay_network: string | null;
  pay_amount: number | string;
  pay_address: string | null;
  actually_paid: number | string | null;
  status: string;
  tx_hash: string | null;
  expires_at: string | null;
  created_at: string;
  message: string | null;
  confirmations: number | null;
  rate_usd: number | string | null;
  receipt_no: string | null;
  last_checked_at: string | null;
}

interface ProofRow {
  tx_hash: string;
  amount_units: string;
}

export const requiredFor = (m: DirectMethod): number => EVM_CONFIRMATIONS[m.networkId] ?? 5;
const isExpired = (row: PaymentRow): boolean => !!row.expires_at && Date.parse(row.expires_at) < Date.now();
const methodNote = (m: DirectMethod): string => `Send only ${m.asset} on ${m.networkLabel}`;

/** Public shape of a method for the picker. */
export function publicMethods() {
  return DIRECT_METHODS.map((m) => ({ id: m.id, asset: m.asset, networkId: m.networkId, networkLabel: m.networkLabel, kind: m.kind, token: m.token ?? null, decimals: m.decimals, note: methodNote(m) }));
}

function toApiStatus(db: string): PayStatus {
  if (db === "finished") return "finished";
  if (db === "expired") return "expired";
  if (db === "failed" || db === "refunded") return "failed";
  if (db === "confirming" || db === "confirmed" || db === "sending") return "confirming";
  return "waiting";
}

async function loadProofs(db: SupabaseClient, paymentId: string): Promise<ProofRow[]> {
  const { data } = await db.from("payment_proofs").select("tx_hash,amount_units").eq("payment_id", paymentId);
  return (data ?? []) as ProofRow[];
}
const sumUnits = (proofs: ProofRow[]): bigint => proofs.reduce((t, p) => t + BigInt(p.amount_units), 0n);

function expectedUnits(row: PaymentRow, m: DirectMethod): bigint {
  return decimalToUnits(numberToDecimal(row.pay_amount, 6), m.decimals);
}

function view(row: PaymentRow, m: DirectMethod | undefined, extra: Partial<PaymentView> = {}): PaymentView {
  const paid = row.actually_paid !== null && row.actually_paid !== undefined ? numberToDecimal(row.actually_paid, m?.decimals && m.decimals < 8 ? m.decimals : 8) : null;
  return {
    paymentId: row.id,
    orderId: row.order_id,
    status: toApiStatus(row.status),
    message: row.message,
    txHash: row.tx_hash,
    confirmations: row.confirmations ?? 0,
    required: m ? requiredFor(m) : 1,
    paidAmount: paid,
    receiptNo: row.receipt_no,
    ...extra,
  };
}

async function patch(db: SupabaseClient, row: PaymentRow, changes: Record<string, unknown>): Promise<PaymentRow> {
  const next = { ...changes, updated_at: new Date().toISOString() };
  await db.from("payments").update(next).eq("id", row.id).in("status", LIVE);
  return { ...row, ...next } as PaymentRow;
}

/** Runs the chain check for the method's family. Transport problems throw. */
async function chainCheck(m: DirectMethod, hash: string, row: PaymentRow): Promise<TxCheck> {
  const notBefore = Math.floor(Date.parse(row.created_at) / 1000) - EARLY_SLACK_SEC;
  return m.kind === "spl" ? verifySolanaTransfer(m, hash, { notBefore }) : verifyEvmTransfer(m, hash, { notBefore });
}

/**
 * Re-checks one direct payment and moves it forward. A waiting payment past expiry with no proof expires.
 * A submitted hash is checked at most once per CHECK_INTERVAL_MS unless forced. A valid, sufficiently confirmed
 * transfer is recorded as a proof (one hash can only ever count for one payment); when the proofs total the
 * expected amount within tolerance the payment is settled exactly once.
 */
export async function refreshPayment(db: SupabaseClient, input: PaymentRow, opts: { force?: boolean } = {}): Promise<PaymentView> {
  let row = input;
  const m = getDirectMethod(row.pay_currency);
  if (!m) return view(row, m);
  if (FINAL.includes(row.status)) return view(row, m);

  const proofs = await loadProofs(db, row.id);
  const expected = expectedUnits(row, m);
  const total = sumUnits(proofs);

  if (proofs.length > 0 && withinTolerance(total, expected)) {
    await settlePayment(db, row, Number(unitsToDecimal(total, m.decimals)));
    const { data } = await db.from("payments").select("*").eq("id", row.id).maybeSingle();
    return view((data as PaymentRow) ?? row, m);
  }

  const hash = row.tx_hash;
  if (!hash) {
    if (isExpired(row) && proofs.length === 0) {
      row = await patch(db, row, { status: "expired", message: "This payment request expired." });
    }
    return view(row, m);
  }
  if (proofs.some((p) => p.tx_hash.toLowerCase() === hash.toLowerCase())) return view(row, m);

  if (!opts.force && row.last_checked_at && Date.now() - Date.parse(row.last_checked_at) < CHECK_INTERVAL_MS) return view(row, m);
  row = await patch(db, row, { last_checked_at: new Date().toISOString() });

  let check: TxCheck;
  try {
    check = await chainCheck(m, hash, row);
  } catch {
    row = await patch(db, row, { message: "The network node is busy. We will check again shortly." });
    return view(row, m);
  }

  if (check.state === "not_found") {
    if (isExpired(row) && Date.now() - Date.parse(row.expires_at as string) > 60 * 60_000 && proofs.length === 0) {
      row = await patch(db, row, { status: "expired", message: "This payment request expired before the transaction appeared." });
      return view(row, m);
    }
    row = await patch(db, row, { status: "confirming", confirmations: 0, message: check.message });
    return view(row, m);
  }

  if (check.state === "rejected") return rejectHash(db, row, m, proofs, check.reason);

  if (row.expires_at && check.blockTime !== null && check.blockTime > Date.parse(row.expires_at) / 1000 + EARLY_SLACK_SEC) {
    return rejectHash(db, row, m, proofs, "That transaction was sent after this payment request expired.");
  }

  if (check.confirmations < check.required) {
    row = await patch(db, row, { status: "confirming", confirmations: check.confirmations, message: `Waiting for confirmations (${check.confirmations} of ${check.required}).` });
    return view(row, m);
  }

  const amountText = unitsToDecimal(check.receivedUnits, m.decimals);
  const { error } = await db.from("payment_proofs").insert({ payment_id: row.id, tx_hash: hash.toLowerCase(), amount: Number(amountText), amount_units: check.receivedUnits.toString(), verified_at: new Date().toISOString() });
  if (error) {
    if (error.code !== "23505") throw new PayError("Could not record the payment proof", 500);
    const { data: owner } = await db.from("payment_proofs").select("payment_id").eq("tx_hash", hash.toLowerCase()).maybeSingle();
    if (owner && owner.payment_id !== row.id) return rejectHash(db, row, m, proofs, "That transaction hash has already been used for another payment.");
  }

  const all = await loadProofs(db, row.id);
  const sum = sumUnits(all);
  if (withinTolerance(sum, expected)) {
    await settlePayment(db, row, Number(unitsToDecimal(sum, m.decimals)));
    const { data } = await db.from("payments").select("*").eq("id", row.id).maybeSingle();
    return view((data as PaymentRow) ?? row, m);
  }
  const msg = `Received ${unitsToDecimal(sum, m.decimals)} of ${numberToDecimal(row.pay_amount, 6)}. Send the remaining amount and submit that hash too`;
  row = await patch(db, row, { status: "partially_paid", confirmations: check.confirmations, actually_paid: Number(unitsToDecimal(sum, m.decimals)), message: msg });
  return view(row, m);
}

/** Drops a submitted hash that cannot pay this order and tells the buyer why. The payment stays open for another hash. */
async function rejectHash(db: SupabaseClient, row: PaymentRow, m: DirectMethod, proofs: ProofRow[], reason: string): Promise<PaymentView> {
  const next = await patch(db, row, { tx_hash: null, status: proofs.length > 0 ? "partially_paid" : "waiting", confirmations: 0, message: reason });
  return view(next, m, { rejected: true });
}

export async function loadOwnedPayment(db: SupabaseClient, userId: string, paymentId: string): Promise<PaymentRow> {
  const { data: row } = await db.from("payments").select("*").eq("id", paymentId).eq("provider", "direct").maybeSingle();
  if (!row) throw new PayError("Payment not found", 404);
  const { data: order } = await db.from("orders").select("id").eq("id", (row as PaymentRow).order_id).eq("user_id", userId).maybeSingle();
  if (!order) throw new PayError("Payment not found", 404);
  return row as PaymentRow;
}

export interface IntentResult {
  paymentId: string;
  methodId: string;
  asset: string;
  networkId: string;
  networkLabel: string;
  address: string;
  amount: string;
  amountUsd: number;
  rate: number | null;
  expiresAt: string;
  minConfirmations: number;
  explorerAddressUrl: string;
  status: "waiting";
}

function intentFrom(row: PaymentRow, m: DirectMethod, amountUsd: number): IntentResult {
  return {
    paymentId: row.id,
    methodId: m.id,
    asset: m.asset,
    networkId: m.networkId,
    networkLabel: m.networkLabel,
    address: m.address,
    amount: numberToDecimal(row.pay_amount, 6),
    amountUsd,
    rate: row.rate_usd === null || row.rate_usd === undefined ? null : Number(row.rate_usd),
    expiresAt: row.expires_at as string,
    minConfirmations: requiredFor(m),
    explorerAddressUrl: `${EXPLORER_ADDRESS[m.networkId]}${m.address}`,
    status: "waiting",
  };
}

/**
 * Creates (or returns) the payment intent for an order and method. Amounts and the recipient come from the server only.
 * Idempotent per order and method; a different method expires the previous untouched intent first.
 */
export async function createIntent(db: SupabaseClient, userId: string, orderId: string, methodId: string): Promise<IntentResult> {
  const m = getDirectMethod(methodId);
  if (!m) throw new PayError("That payment option is not available", 400);
  const { data: order } = await db.from("orders").select("id,user_id,price_usd,status").eq("id", orderId).eq("user_id", userId).maybeSingle();
  if (!order) throw new PayError("Order not found", 404);
  if (order.status !== "pending") throw new PayError("Order is not payable", 409);
  const usd = Number(order.price_usd);
  if (!Number.isFinite(usd) || usd <= 0) throw new PayError("Order is not payable", 409);

  const { data: live } = await db.from("payments").select("*").eq("order_id", orderId).eq("provider", "direct").in("status", LIVE);
  for (const p of (live ?? []) as PaymentRow[]) {
    const expired = isExpired(p);
    const untouched = !p.tx_hash && p.status !== "partially_paid" && p.status !== "confirming";
    if (p.pay_currency === m.id && !expired) return intentFrom(p, m, usd);
    if (expired && untouched) {
      await db.from("payments").update({ status: "expired", message: "This payment request expired.", updated_at: new Date().toISOString() }).eq("id", p.id).in("status", LIVE);
    } else if (!expired && untouched) {
      await db.from("payments").update({ status: "expired", message: "Replaced by another payment method.", updated_at: new Date().toISOString() }).eq("id", p.id).in("status", LIVE);
    } else if (!expired) {
      throw new PayError("A payment for this order is already in progress. Wait for it to confirm or expire.", 409);
    }
  }

  let amount: string;
  let rate: number | null = null;
  try {
    if (m.kind === "native") {
      rate = await usdRate(m.priceId as string);
      amount = nativeAmount(usd, rate, 6);
    } else {
      amount = stableAmount(usd, 6);
    }
  } catch {
    throw new PayError("Live pricing is unavailable right now. Try again in a moment or choose a stablecoin.", 503);
  }

  const expiresAt = new Date(Date.now() + (m.kind === "native" ? NATIVE_TTL_MS : STABLE_TTL_MS)).toISOString();
  const { data: created, error } = await db.from("payments").insert({
    order_id: orderId,
    provider: "direct",
    pay_currency: m.id,
    pay_network: m.networkId,
    pay_amount: Number(amount),
    pay_address: m.address,
    status: "waiting",
    expires_at: expiresAt,
    rate_usd: rate,
  }).select("*").single();
  if (error || !created) {
    if (error?.code === "23505") {
      const { data: again } = await db.from("payments").select("*").eq("order_id", orderId).eq("provider", "direct").eq("pay_currency", m.id).in("status", LIVE).maybeSingle();
      if (again) return intentFrom(again as PaymentRow, m, usd);
    }
    throw new PayError("Could not create the payment", 500);
  }
  return intentFrom(created as PaymentRow, m, usd);
}

/** Validates the hash for the method, stores it as pending proof and verifies immediately. */
export async function submitProof(db: SupabaseClient, userId: string, paymentId: string, txHashRaw: string): Promise<PaymentView> {
  const row = await loadOwnedPayment(db, userId, paymentId);
  const m = getDirectMethod(row.pay_currency);
  if (!m) throw new PayError("Payment not found", 404);
  const hash = txHashRaw.trim();
  const valid = m.kind === "spl" ? isSolanaSignature(hash) : isEvmHash(hash);
  if (!valid) return { ...view(row, m), rejected: true, message: m.kind === "spl" ? "That is not a valid Solana transaction signature." : "That is not a valid transaction hash (0x followed by 64 hex characters)." };

  const stored = m.kind === "spl" ? hash : hash.toLowerCase();
  if (row.status === "finished") return { ...view(row, m), rejected: stored.toLowerCase() !== (row.tx_hash ?? "").toLowerCase(), message: "This order is already paid." };
  const fresh = await refreshPayment(db, row, {});
  if (fresh.status === "expired" || fresh.status === "failed") return { ...fresh, rejected: true, message: fresh.message ?? "This payment request is no longer open." };
  if (fresh.status === "finished") return { ...fresh, rejected: true, message: "This order is already paid." };

  const { data: used } = await db.from("payment_proofs").select("payment_id").eq("tx_hash", stored.toLowerCase()).maybeSingle();
  if (used) {
    if (used.payment_id === row.id) return fresh;
    return { ...fresh, rejected: true, message: "That transaction hash has already been used for another payment." };
  }

  const { error } = await db.from("payments").update({ tx_hash: stored, message: null, last_checked_at: null, confirmations: 0, status: "confirming", updated_at: new Date().toISOString() }).eq("id", row.id).in("status", LIVE);
  if (error) {
    if (error.code === "23505") return { ...fresh, rejected: true, message: "That transaction hash has already been used for another payment." };
    throw new PayError("Could not store the transaction hash", 500);
  }
  const { data: updated } = await db.from("payments").select("*").eq("id", row.id).maybeSingle();
  return refreshPayment(db, (updated as PaymentRow) ?? row, { force: true });
}
