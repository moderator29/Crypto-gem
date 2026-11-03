import { CheckoutError, createPaymentForOrder } from "@/lib/payments/checkout";
import { supabaseConfigured, userFromRequest } from "@/lib/supabase/admin";
import { isConfigured } from "@/lib/payments/nowpayments";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const body = z.object({ orderId: z.string().uuid(), payCurrency: z.string().regex(/^[a-z0-9]{2,20}$/) });

/** (Re)creates the provider payment for an order, for example after expiry or to switch currency. */
export async function POST(req: Request) {
  if (!supabaseConfigured() || !isConfigured()) return Response.json({ error: "Payments are not configured." }, { status: 503 });
  if (!rateLimit(`pay:${clientKey(req)}`, 15, 60_000).ok) return Response.json({ error: "Too many requests" }, { status: 429 });
  const user = await userFromRequest(req);
  if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 422 });
  try {
    const p = await createPaymentForOrder(user.id, parsed.data.orderId, parsed.data.payCurrency);
    return Response.json({ paymentId: p.id });
  } catch (e) {
    if (e instanceof CheckoutError) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: "Payment provider is unavailable. Try again." }, { status: 502 });
  }
}
