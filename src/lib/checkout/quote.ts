import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { DIRECT_METHODS, EXPLORER_ADDRESS, getDirectMethod, type DirectMethod } from "@/lib/payments/direct/methods";
import { usdRate } from "@/lib/payments/direct/price";
import { EVM_CONFIRMATIONS, nativeWithFingerprint, stableWithFingerprint } from "@/lib/payments/direct/units";
import { checkItemDates, describeItem, type CheckoutItem } from "./items";
import { signToken } from "./token";
import type { PublicMethod, QuoteResponse } from "./types";

export const STABLE_TTL_MS = 60 * 60_000;
export const NATIVE_TTL_MS = 20 * 60_000;
/** Fingerprints use the last four digits of the amount: k runs from 1 to 9999. */
export const FINGERPRINT_MAX = 9999;

export interface QuotePayload {
  v: 1;
  typ: "quote";
  kind: CheckoutItem["kind"];
  item: CheckoutItem;
  priceUsd: number;
  methodId: string;
  amount: string;
  rate: number | null;
  createdAt: string;
  expiresAt: string;
  nonce: string;
}

/** Random source for amount fingerprints. Replaceable in tests. */
export const checkoutRng = { fingerprint: (): number => randomInt(1, FINGERPRINT_MAX + 1) };

export class CheckoutError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export const isStable = (m: DirectMethod): boolean => m.kind !== "native";
export const requiredConfirmations = (m: DirectMethod): number => EVM_CONFIRMATIONS[m.networkId] ?? 5;

export function publicMethods(): PublicMethod[] {
  return DIRECT_METHODS.map((m) => ({
    id: m.id,
    asset: m.asset,
    networkId: m.networkId,
    networkLabel: m.networkLabel,
    kind: m.kind,
    token: m.token ?? null,
    decimals: m.decimals,
    note: `Send only ${m.asset} on ${m.networkLabel}`,
  }));
}

/**
 * Prices a validated item from the catalog, picks a fingerprinted amount for the method and signs
 * everything into a quote token. The client never supplies a price or an amount.
 */
export async function createQuote(methodId: string, item: CheckoutItem, secret: string, now = new Date()): Promise<QuoteResponse> {
  const m = getDirectMethod(methodId);
  if (!m) throw new CheckoutError("Unknown payment method");
  const dateError = checkItemDates(item, now);
  if (dateError) throw new CheckoutError(dateError);
  const desc = describeItem(item);
  const usd = desc.priceUsd;
  if (!Number.isFinite(usd) || usd <= 0) throw new CheckoutError("This item has no price", 500);

  let rate: number | null = null;
  if (!isStable(m)) {
    if (!m.priceId) throw new CheckoutError("Method has no price source", 500);
    try {
      rate = await usdRate(m.priceId);
    } catch {
      throw new CheckoutError(`The ${m.asset} price is unavailable right now. Try a stablecoin or retry in a minute.`, 503);
    }
  }

  const k = checkoutRng.fingerprint();
  const amount = rate === null ? stableWithFingerprint(usd, k) : nativeWithFingerprint(usd, rate, k);
  const expiresAt = new Date(now.getTime() + (rate === null ? STABLE_TTL_MS : NATIVE_TTL_MS));
  const payload: QuotePayload = {
    v: 1,
    typ: "quote",
    kind: item.kind,
    item,
    priceUsd: usd,
    methodId: m.id,
    amount,
    rate,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    nonce: randomBytes(12).toString("base64url"),
  };
  const amountUsd = rate === null ? Number(amount) : Math.round(Number(amount) * rate * 100) / 100;
  return {
    token: signToken(payload, secret),
    methodId: m.id,
    asset: m.asset,
    networkId: m.networkId,
    networkLabel: m.networkLabel,
    address: m.address,
    amount,
    amountNote:
      rate === null
        ? "Send exactly this amount. The last digits identify your payment."
        : `Send exactly this amount. The last digits identify your payment. It includes a small buffer for price moves while the quote is held.`,
    amountUsd,
    rate,
    expiresAt: payload.expiresAt,
    minConfirmations: requiredConfirmations(m),
    explorerAddressUrl: `${EXPLORER_ADDRESS[m.networkId]}${m.address}`,
    item: { title: desc.title, lines: desc.lines },
  };
}
