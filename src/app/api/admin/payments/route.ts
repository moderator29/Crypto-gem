import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ACCESS, hasAnyRole } from "@/lib/admin/roles";
import { guard, json } from "@/lib/admin/route";
import { EXPLORER_ADDRESS, EXPLORER_TX } from "@/lib/payments/direct/methods";
import { receivingWallets } from "./wallets";

export const dynamic = "force-dynamic";

const STATUSES = ["created", "waiting", "confirming", "confirmed", "sending", "partially_paid", "finished", "failed", "expired", "refunded"] as const;

const query = z.object({
  status: z.enum(STATUSES).optional(),
  provider: z.enum(["direct", "nowpayments"]).optional(),
  kind: z.enum(["listing", "ad_campaign", "boost"]).optional(),
  /** Exact order id (uuid) or exact provider payment id. */
  q: z.string().trim().min(1).max(80).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Read-only payments list with its order. Filters are exact matches, never pattern searches. */
export async function GET(req: Request) {
  const auth = await guard(req, ACCESS.payments);
  if (!auth.ok) return auth.response;
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return json({ error: "Invalid filters" }, 422);
  const { status, provider, kind, q, from, to, limit, offset } = parsed.data;

  const columns = "id,order_id,provider,provider_payment_id,pay_currency,pay_network,pay_address,pay_amount,actually_paid,status,tx_hash,message,created_at,updated_at,expires_at";
  const join = "orders!inner(id,user_id,kind,ref_id,price_usd,status,paid_at)";
  let qb = supabaseAdmin().from("payments").select(`${columns},${join}`, { count: "exact" });
  if (status) qb = qb.eq("status", status);
  if (provider) qb = qb.eq("provider", provider);
  if (kind) qb = qb.eq("orders.kind", kind);
  if (q) qb = UUID.test(q) ? qb.eq("order_id", q) : qb.eq("provider_payment_id", q);
  if (from) qb = qb.gte("created_at", from);
  if (to) qb = qb.lte("created_at", to);
  const { data, count, error } = await qb.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (error) return json({ error: "Could not load payments." }, 502);
  return json({ items: data ?? [], total: count ?? 0, wallets: receivingWallets(), canWrite: hasAnyRole(auth.actor.roles, ["admin"]), explorer: { tx: EXPLORER_TX, address: EXPLORER_ADDRESS } });
}
