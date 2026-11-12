import { errorResponse, fail, gate, ok, readJson } from "@/lib/payments/direct/http";
import { submitProof } from "@/lib/payments/direct/service";
import { isUuid } from "@/lib/payments/direct/units";

export const dynamic = "force-dynamic";

/** Stores the buyer's transaction hash as pending proof and verifies it on chain right away. */
export async function POST(req: Request) {
  const g = await gate(req, "submit", 20);
  if (g instanceof Response) return g;
  const body = await readJson(req);
  if (!body || !isUuid(body.paymentId) || typeof body.txHash !== "string") return fail("Invalid request", 400);
  try {
    const v = await submitProof(g.db, g.user.id, body.paymentId, body.txHash);
    return ok({
      accepted: !v.rejected,
      reason: v.message ?? undefined,
      status: v.status,
      confirmations: v.confirmations,
      required: v.required,
      txHash: v.txHash,
      paidAmount: v.paidAmount,
      receiptNo: v.receiptNo,
      orderId: v.orderId,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
