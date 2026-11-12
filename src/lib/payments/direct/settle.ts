import type { SupabaseClient } from "@supabase/supabase-js";
import { notify } from "@/lib/notify";
import { fulfilOrder } from "@/lib/payments/fulfil";
import { receiptNumber } from "./units";

/**
 * Marks a verified direct payment as paid. Safe to call repeatedly and concurrently:
 * the order moves pending to paid only once (guarded update), only that caller notifies,
 * and fulfilOrder is itself guarded by product status.
 */
export async function settlePayment(db: SupabaseClient, payment: { id: string; order_id: string }, paidAmount: number): Promise<void> {
  const now = new Date().toISOString();
  const { data: order } = await db.from("orders").select("id,user_id,kind,ref_id,status").eq("id", payment.order_id).maybeSingle();
  if (!order) return;

  await db.from("payments").update({ status: "finished", actually_paid: paidAmount, message: null, updated_at: now }).eq("id", payment.id).neq("status", "finished");

  const { data: claimed } = await db.from("orders").update({ status: "paid", paid_at: now }).eq("id", order.id).eq("status", "pending").select("id");
  const firstToPay = Array.isArray(claimed) && claimed.length > 0;
  if (firstToPay || order.status === "paid") await fulfilOrder(db, { id: order.id as string, kind: order.kind as string, ref_id: order.ref_id as string });
  if (firstToPay && order.user_id) {
    await notify(db, order.user_id as string, "payment", "Payment confirmed", `Your ${String(order.kind).replace("_", " ")} order is paid and now in progress.`, `/receipt/${order.id}`);
  }
  await db.from("payments").update({ receipt_no: receiptNumber(payment.id, new Date(now)) }).eq("id", payment.id).is("receipt_no", null);
}
