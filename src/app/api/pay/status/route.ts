import { errorResponse, fail, gate, ok } from "@/lib/payments/direct/http";
import { loadOwnedPayment, refreshPayment } from "@/lib/payments/direct/service";
import { isUuid } from "@/lib/payments/direct/units";

export const dynamic = "force-dynamic";

/** Current state of a payment. Re-checks the chain (at most once per 4 seconds) while a hash is pending. */
export async function GET(req: Request) {
  const g = await gate(req, "status", 90);
  if (g instanceof Response) return g;
  const paymentId = new URL(req.url).searchParams.get("paymentId");
  if (!isUuid(paymentId)) return fail("Invalid payment", 400);
  try {
    const row = await loadOwnedPayment(g.db, g.user.id, paymentId);
    const v = await refreshPayment(g.db, row, {});
    return ok({ paymentId: v.paymentId, orderId: v.orderId, status: v.status, message: v.message, txHash: v.txHash, confirmations: v.confirmations, required: v.required, paidAmount: v.paidAmount, receiptNo: v.receiptNo });
  } catch (e) {
    return errorResponse(e);
  }
}
