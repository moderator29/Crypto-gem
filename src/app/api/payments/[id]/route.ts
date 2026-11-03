import { getDb, dbConfigured, userFromRequest } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Order and latest payment for the payment page. Owner only. Status comes from the database, which only the verified webhook updates. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!dbConfigured()) return Response.json({ error: "Not configured" }, { status: 503 });
  const user = await userFromRequest(req);
  if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
  const db = getDb();
  const { data: order } = await db.from("orders").select("id,kind,price_usd,status,created_at,paid_at").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });
  const { data: payment } = await db.from("payments").select("id,provider_payment_id,pay_currency,pay_network,pay_amount,pay_address,actually_paid,status,tx_hash,expires_at").eq("order_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: methods } = await db.from("payment_methods").select("id,label,provider_currency,network").eq("enabled", true).order("sort");
  return Response.json({ order, payment, methods: methods ?? [] });
}
