import { errorResponse, fail, gate, ok, readJson } from "@/lib/payments/direct/http";
import { createIntent } from "@/lib/payments/direct/service";
import { isUuid } from "@/lib/payments/direct/units";

export const dynamic = "force-dynamic";

/** Creates or returns the payment intent for an order. The amount and recipient are decided here, never by the client. */
export async function POST(req: Request) {
  const g = await gate(req, "intent", 20);
  if (g instanceof Response) return g;
  const body = await readJson(req);
  if (!body || !isUuid(body.orderId) || typeof body.methodId !== "string") return fail("Invalid request", 400);
  try {
    return ok(await createIntent(g.db, g.user.id, body.orderId, body.methodId));
  } catch (e) {
    return errorResponse(e);
  }
}
