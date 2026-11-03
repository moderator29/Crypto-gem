import { createHash } from "node:crypto";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { fulfilOrder } from "@/lib/payments/fulfil";
import { checkIpnAgainstOrder, mapStatus, verifyIpn, type IpnPayload } from "@/lib/payments/nowpayments";

export const dynamic = "force-dynamic";

/**
 * NOWPayments IPN. Order of checks: signature, replay fingerprint, payment
 * lookup, order binding and amount. Only after all pass does `finished`
 * mark the order paid and move the listing into review.
 */
export async function POST(req: Request) {
  if (!supabaseConfigured()) return new Response("not configured", { status: 503 });
  const raw = await req.text();
  if (raw.length > 20_000) return new Response("too large", { status: 413 });
  let body: IpnPayload;
  try {
    body = JSON.parse(raw) as IpnPayload;
  } catch {
    return new Response("bad json", { status: 400 });
  }
  if (!verifyIpn(body, req.headers.get("x-nowpayments-sig"), process.env.NOWPAYMENTS_IPN_SECRET)) return new Response("bad signature", { status: 401 });

  const db = supabaseAdmin();
  const providerId = String(body.payment_id);
  const status = mapStatus(body.payment_status);
  const fingerprint = createHash("sha256").update(`${providerId}|${status}|${body.actually_paid ?? ""}`).digest("hex");

  const { data: payment } = await db.from("payments").select("id,order_id,pay_currency,pay_amount,status").eq("provider", "nowpayments").eq("provider_payment_id", providerId).maybeSingle();
  if (!payment) return new Response("unknown payment", { status: 404 });

  const { error: dupe } = await db.from("payment_events").insert({ payment_id: payment.id, provider_payment_id: providerId, status, payload: body, fingerprint });
  if (dupe) return new Response(dupe.code === "23505" ? "duplicate" : "error", { status: dupe.code === "23505" ? 200 : 500 });

  const { data: order } = await db.from("orders").select("id,price_usd,status,kind,ref_id").eq("id", payment.order_id).maybeSingle();
  if (!order) return new Response("order missing", { status: 404 });
  const check = checkIpnAgainstOrder(body, { orderId: order.id, providerPaymentId: providerId, priceUsd: Number(order.price_usd), payCurrency: payment.pay_currency, payAmount: Number(payment.pay_amount) });
  if (!check.ok) return new Response(`rejected: ${check.reason}`, { status: 200 });

  // Never move backwards out of a terminal state.
  const terminal = ["finished", "failed", "expired", "refunded"];
  if (!terminal.includes(payment.status)) {
    await db.from("payments").update({ status: check.status, actually_paid: body.actually_paid ?? null, updated_at: new Date().toISOString() }).eq("id", payment.id);
  }
  if (check.status === "finished" && order.status === "pending") {
    await db.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", order.id).eq("status", "pending");
    await fulfilOrder(db, { id: order.id, kind: order.kind, ref_id: order.ref_id });
  }
  return new Response("ok");
}
