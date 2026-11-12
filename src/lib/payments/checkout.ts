import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mapStatus, nowpayments } from "./nowpayments";

export class CheckoutError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * Creates the provider payment for an existing order and stores it.
 * The currency must be enabled both by the provider and by an administrator
 * (payment_methods), so we never offer a combination we cannot settle.
 * An order that already has a live payment returns it instead of creating a duplicate.
 */
export async function createPaymentForOrder(userId: string, orderId: string, payCurrency: string) {
  const db = supabaseAdmin();
  const { data: order } = await db.from("orders").select("id,user_id,price_usd,status,kind").eq("id", orderId).eq("user_id", userId).maybeSingle();
  if (!order) throw new CheckoutError("Order not found", 404);
  if (order.status !== "pending") throw new CheckoutError("Order is not payable", 409);

  const { data: existing } = await db.from("payments").select("*").eq("order_id", orderId).in("status", ["created", "waiting", "confirming", "confirmed", "sending", "partially_paid"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing && existing.pay_currency === payCurrency && (!existing.expires_at || Date.parse(existing.expires_at) > Date.now())) return existing;

  const { data: method } = await db.from("payment_methods").select("id").eq("provider_currency", payCurrency).eq("enabled", true).maybeSingle();
  if (!method) throw new CheckoutError("That payment option is not available", 400);
  const enabled = await nowpayments.currencies();
  if (!enabled.map((c) => c.toLowerCase()).includes(payCurrency)) throw new CheckoutError("That payment option is not available", 400);

  const created = await nowpayments.create({
    orderId,
    priceUsd: Number(order.price_usd),
    payCurrency,
    description: `Crypto Gems ${order.kind}`,
    ipnCallbackUrl: `${siteUrl()}/api/webhooks/nowpayments`,
  });
  const { data: row, error } = await db.from("payments").insert({
    order_id: orderId,
    provider_payment_id: String(created.payment_id),
    pay_currency: payCurrency,
    pay_network: created.network ?? null,
    pay_amount: created.pay_amount,
    pay_address: created.pay_address,
    status: mapStatus(created.payment_status),
    expires_at: created.expiration_estimate_date ?? null,
  }).select("*").single();
  if (error) throw new CheckoutError("Could not record the payment", 500);
  return row;
}

/** Direct crypto payment path: the buyer pays our wallet and the server verifies the transfer on chain. */
export { createIntent as createDirectPaymentForOrder } from "./direct/service";
