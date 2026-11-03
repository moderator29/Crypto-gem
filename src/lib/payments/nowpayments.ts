import { createHmac, timingSafeEqual } from "node:crypto";

export type PaymentStatus =
  | "created"
  | "waiting"
  | "confirming"
  | "confirmed"
  | "sending"
  | "partially_paid"
  | "finished"
  | "failed"
  | "expired"
  | "refunded";

const KNOWN: PaymentStatus[] = ["waiting", "confirming", "confirmed", "sending", "partially_paid", "finished", "failed", "expired", "refunded"];

/** Map a provider status string onto our state machine. Unknown values never count as paid. */
export function mapStatus(raw: unknown): PaymentStatus {
  const s = typeof raw === "string" ? raw.toLowerCase() : "";
  return (KNOWN as string[]).includes(s) ? (s as PaymentStatus) : "created";
}

/** Only `finished` fulfils an order. `confirmed` and `sending` are still in flight on the provider side. */
export const FULFILLING_STATUS: PaymentStatus = "finished";

export function isFinal(s: PaymentStatus): boolean {
  return s === "finished" || s === "failed" || s === "expired" || s === "refunded";
}

/** Recursively sort object keys, as the NOWPayments IPN signature requires. */
export function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    return Object.keys(v as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeys((v as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return v;
}

/** HMAC-SHA512 over the key-sorted JSON body, hex encoded. */
export function signIpn(body: unknown, secret: string): string {
  return createHmac("sha512", secret).update(JSON.stringify(sortKeys(body))).digest("hex");
}

/** Constant-time signature check. Returns false for any malformed input. */
export function verifyIpn(body: unknown, signature: string | null, secret: string | undefined): boolean {
  if (!secret || !signature) return false;
  const expected = Buffer.from(signIpn(body, secret), "hex");
  let given: Buffer;
  try {
    given = Buffer.from(signature.trim(), "hex");
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export interface IpnPayload {
  payment_id: number | string;
  payment_status: string;
  order_id?: string;
  pay_address?: string;
  price_amount?: number | string;
  price_currency?: string;
  pay_amount?: number | string;
  actually_paid?: number | string;
  pay_currency?: string;
  outcome_amount?: number | string;
  outcome_currency?: string;
}

export interface ExpectedOrder {
  orderId: string;
  providerPaymentId: string;
  priceUsd: number;
  payCurrency: string;
  payAmount: number;
}

export type IpnCheck = { ok: true; status: PaymentStatus } | { ok: false; reason: string };

/**
 * Validate an IPN against the order we created. The signature proves the
 * message is from the provider; this proves it is about THIS order, with the
 * amount and currency we asked for. Fulfilment still waits for `finished`.
 */
export function checkIpnAgainstOrder(p: IpnPayload, order: ExpectedOrder): IpnCheck {
  if (String(p.payment_id) !== order.providerPaymentId) return { ok: false, reason: "payment_id mismatch" };
  if (p.order_id !== order.orderId) return { ok: false, reason: "order_id mismatch" };
  if (p.pay_currency && p.pay_currency.toLowerCase() !== order.payCurrency.toLowerCase()) return { ok: false, reason: "currency mismatch" };
  if (p.price_currency && p.price_currency.toLowerCase() !== "usd") return { ok: false, reason: "price currency mismatch" };
  if (p.price_amount !== undefined && Math.abs(Number(p.price_amount) - order.priceUsd) > 0.005) return { ok: false, reason: "price mismatch" };
  const status = mapStatus(p.payment_status);
  if (status === "finished") {
    const paid = Number(p.actually_paid);
    if (!Number.isFinite(paid) || paid < order.payAmount * 0.995) return { ok: false, reason: "underpaid" };
  }
  return { ok: true, status };
}

// ---- API client -----------------------------------------------------------

function base(): string {
  return process.env.NOWPAYMENTS_SANDBOX === "true" ? "https://api-sandbox.nowpayments.io/v1" : "https://api.nowpayments.io/v1";
}

export function isConfigured(): boolean {
  return Boolean(process.env.NOWPAYMENTS_API_KEY);
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.NOWPAYMENTS_API_KEY;
  if (!key) throw new Error("NOWPAYMENTS_API_KEY is not set");
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: { "x-api-key": key, "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`NOWPayments ${path} failed with ${res.status}`);
  return (await res.json()) as T;
}

export interface CreatePaymentInput {
  orderId: string;
  priceUsd: number;
  payCurrency: string;
  description: string;
  ipnCallbackUrl: string;
}

export interface ProviderPayment {
  payment_id: string | number;
  payment_status: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  price_amount: number;
  order_id: string;
  expiration_estimate_date?: string;
  network?: string;
  payin_extra_id?: string | null;
}

export const nowpayments = {
  /** Enabled payment currencies for this merchant account, straight from the provider. */
  currencies: () => api<{ currencies: string[] }>("/merchant/coins").then((r) => r.currencies),
  minAmount: (currencyFrom: string) => api<{ min_amount: number }>(`/min-amount?currency_from=${encodeURIComponent(currencyFrom)}&currency_to=usd`),
  create: (i: CreatePaymentInput) =>
    api<ProviderPayment>("/payment", {
      method: "POST",
      body: JSON.stringify({
        price_amount: i.priceUsd,
        price_currency: "usd",
        pay_currency: i.payCurrency,
        order_id: i.orderId,
        order_description: i.description,
        ipn_callback_url: i.ipnCallbackUrl,
      }),
    }),
  get: (id: string) => api<ProviderPayment & { actually_paid?: number }>(`/payment/${encodeURIComponent(id)}`),
};
