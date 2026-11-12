import { z } from "zod";
import { notify } from "@/lib/notify";
import { hasAnyRole, ACCESS, type StaffRole } from "@/lib/admin/roles";
import { auditOrFail, guard, json, parseBody } from "@/lib/admin/route";
import { fulfilOrder } from "@/lib/payments/fulfil";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyDirectPayment } from "./verify";

export const dynamic = "force-dynamic";

/** Roles that may move money state by hand. Support can read and re-verify, not override. */
const WRITE_ROLES = ["admin"] as const satisfies readonly StaffRole[];

const body = z.object({
  paymentId: z.string().uuid(),
  action: z.enum(["verify", "mark_paid", "reject"]),
  reason: z.string().trim().min(10, "needs at least 10 characters").max(500).optional(),
});

const OPEN = ["created", "waiting", "confirming", "confirmed", "sending", "partially_paid"];

/**
 * Audited actions on one direct payment. "verify" re-checks the chain now. "mark_paid" settles by hand with a
 * written reason: the order moves pending to paid exactly once (guarded update), then the product is fulfilled.
 * "reject" closes a payment that will never be honoured. Every action writes an audit row.
 */
export async function POST(req: Request) {
  const auth = await guard(req, ACCESS.payments, "write");
  if (!auth.ok) return auth.response;
  const parsed = await parseBody(req, body);
  if (!parsed.ok) return parsed.response;
  const { paymentId, action, reason } = parsed.data;
  if (action !== "verify" && !hasAnyRole(auth.actor.roles, WRITE_ROLES)) return json({ error: "Your account may not change payment state." }, 403);
  if (action !== "verify" && !reason) return json({ error: "A written reason is required." }, 422);

  const db = supabaseAdmin();
  const { data: payment, error } = await db.from("payments").select("*").eq("id", paymentId).maybeSingle();
  if (error) return json({ error: "Could not load the payment." }, 502);
  if (!payment || payment.provider !== "direct") return json({ error: "Direct payment not found." }, 404);
  const target = `payments:${paymentId}`;

  if (action === "verify") {
    let result: unknown;
    try {
      result = await verifyDirectPayment(db, paymentId);
    } catch {
      return json({ error: "The chain check failed. Try again shortly." }, 502);
    }
    const failed = await auditOrFail(auth.actor, "payment.verify", target, { status: payment.status }, result);
    if (failed) return failed;
    return json({ ok: true, result });
  }

  if (!OPEN.includes(payment.status as string)) return json({ error: `This payment is already ${String(payment.status)}.` }, 409);
  const now = new Date().toISOString();

  if (action === "reject") {
    const { data: after, error: uErr } = await db.from("payments").update({ status: "failed", message: `Rejected by staff: ${reason}`, updated_at: now }).eq("id", paymentId).in("status", OPEN).select("*").maybeSingle();
    if (uErr || !after) return json({ error: "Could not reject the payment." }, 502);
    const failed = await auditOrFail(auth.actor, "payment.reject", target, { status: payment.status }, { status: "failed", reason });
    if (failed) return failed;
    return json({ ok: true });
  }

  const { data: order } = await db.from("orders").select("id,user_id,kind,ref_id,status").eq("id", payment.order_id).maybeSingle();
  if (!order) return json({ error: "The order for this payment was not found." }, 404);
  const { data: claimed, error: cErr } = await db.from("orders").update({ status: "paid", paid_at: now }).eq("id", order.id).eq("status", "pending").select("id");
  if (cErr) return json({ error: "Could not update the order." }, 502);
  if (!Array.isArray(claimed) || claimed.length === 0) return json({ error: `The order is already ${String(order.status)}. Nothing was changed.` }, 409);

  await db.from("payments").update({ status: "finished", message: `Marked paid by staff: ${reason}`, updated_at: now }).eq("id", paymentId).in("status", OPEN);
  const failed = await auditOrFail(auth.actor, "payment.mark_paid", target, { payment: payment.status, order: order.status }, { payment: "finished", order: "paid", reason });
  await fulfilOrder(db, { id: order.id as string, kind: order.kind as string, ref_id: order.ref_id as string });
  if (order.user_id) await notify(db, order.user_id as string, "payment", "Payment confirmed", `Your ${String(order.kind).replace("_", " ")} order is paid and now in progress.`, `/receipt/${order.id}`);
  if (failed) return failed;
  return json({ ok: true });
}
