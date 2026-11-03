import { z } from "zod";
import { getDb } from "@/lib/db";
import { ACCESS } from "@/lib/admin/roles";
import { guard, json } from "@/lib/admin/route";

export const dynamic = "force-dynamic";

const STATUSES = ["created", "waiting", "confirming", "confirmed", "sending", "partially_paid", "finished", "failed", "expired", "refunded"] as const;

const query = z.object({
  status: z.enum(STATUSES).optional(),
  kind: z.enum(["listing", "ad_campaign", "boost"]).optional(),
  /** Exact order id (uuid) or exact provider payment id. */
  q: z.string().trim().min(1).max(80).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COLUMNS = ["id", "order_id", "provider", "provider_payment_id", "pay_currency", "pay_network", "pay_amount", "actually_paid", "status", "tx_hash", "created_at", "updated_at", "expires_at"].map((c) => `p.${c}`).join(", ");
const ORDER_JSON = "json_build_object('id', o.id, 'user_id', o.user_id, 'kind', o.kind, 'ref_id', o.ref_id, 'price_usd', o.price_usd, 'status', o.status, 'paid_at', o.paid_at)";

/**
 * Read-only payments list with its order. Filters are exact matches, never pattern searches. This is the one
 * read that needs a join, so it uses static SQL text with every value bound as a parameter. limit and offset
 * are integers already validated by the schema above.
 */
export async function GET(req: Request) {
  const auth = await guard(req, ACCESS.payments);
  if (!auth.ok) return auth.response;
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return json({ error: "Invalid filters" }, 422);
  const { status, kind, q, from, to, limit, offset } = parsed.data;

  const where: string[] = [];
  const params: unknown[] = [];
  const add = (clause: string, value: unknown) => {
    params.push(value);
    where.push(clause.replace("?", `$${params.length}`));
  };
  if (status) add("p.status = ?", status);
  if (kind) add("o.kind::text = ?", kind);
  if (q) add(UUID.test(q) ? "p.order_id = ?" : "p.provider_payment_id = ?", q);
  if (from) add("p.created_at >= ?", from);
  if (to) add("p.created_at <= ?", to);
  const clause = where.length ? ` where ${where.join(" and ")}` : "";
  const join = "from payments p join orders o on o.id = p.order_id";

  try {
    const db = getDb();
    const [countRows, items] = await Promise.all([
      db.sql(`select count(*)::text as n ${join}${clause}`, params),
      db.sql(`select ${COLUMNS}, ${ORDER_JSON} as orders ${join}${clause} order by p.created_at desc limit ${limit} offset ${offset}`, params),
    ]);
    return json({ items, total: Number(countRows[0]?.n ?? 0) });
  } catch {
    return json({ error: "Could not load payments." }, 502);
  }
}
