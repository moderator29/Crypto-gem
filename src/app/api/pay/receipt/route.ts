import { errorResponse, fail, gate, ok } from "@/lib/payments/direct/http";
import { buildReceipt } from "@/lib/payments/direct/receipt";
import { isUuid } from "@/lib/payments/direct/units";

export const dynamic = "force-dynamic";

/** Receipt for a paid order, visible only to its owner. */
export async function GET(req: Request) {
  const g = await gate(req, "receipt", 60);
  if (g instanceof Response) return g;
  const orderId = new URL(req.url).searchParams.get("orderId");
  if (!isUuid(orderId)) return fail("Invalid order", 400);
  try {
    return ok(await buildReceipt(g.db, g.user.id, orderId));
  } catch (e) {
    return errorResponse(e);
  }
}
