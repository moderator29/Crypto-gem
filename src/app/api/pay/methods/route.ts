import { errorResponse, fail, gate, ok } from "@/lib/payments/direct/http";
import { publicMethods } from "@/lib/payments/direct/service";
import { isUuid } from "@/lib/payments/direct/units";

export const dynamic = "force-dynamic";

/** The static list of direct payment options. When an order id is given it must belong to the caller. */
export async function GET(req: Request) {
  const g = await gate(req, "methods", 60);
  if (g instanceof Response) return g;
  try {
    const orderId = new URL(req.url).searchParams.get("orderId");
    if (orderId !== null) {
      if (!isUuid(orderId)) return fail("Invalid order", 400);
      const { data } = await g.db.from("orders").select("id").eq("id", orderId).eq("user_id", g.user.id).maybeSingle();
      if (!data) return fail("Order not found", 404);
    }
    return ok({ methods: publicMethods() });
  } catch (e) {
    return errorResponse(e);
  }
}
