import { getDb } from "@/lib/db";
import { ACCESS } from "@/lib/admin/roles";
import { guard, json } from "@/lib/admin/route";

export const dynamic = "force-dynamic";

const IN_FLIGHT = ["created", "waiting", "confirming", "confirmed", "sending", "partially_paid"];
const PAGE = 1000;
const MAX_PAGES = 20;

/**
 * Headline counts from real queries. Revenue is the sum of `orders.price_usd` for paid orders,
 * read in pages. If more than MAX_PAGES * PAGE paid orders exist the figure is flagged as partial.
 */
export async function GET(req: Request) {
  const auth = await guard(req, ACCESS.overview);
  if (!auth.ok) return auth.response;
  const db = getDb();
  const nowIso = new Date().toISOString();

  const [pending, published, payments, paid, active] = await Promise.all([
    db.from("token_submissions").select("id", { count: "exact", head: true }).in("status", ["submitted", "pending_review"]),
    db.from("token_submissions").select("id", { count: "exact", head: true }).eq("status", "published"),
    db.from("payments").select("id", { count: "exact", head: true }).in("status", IN_FLIGHT),
    db.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid"),
    db.from("advertising_campaigns").select("id", { count: "exact", head: true }).eq("status", "active").lte("starts_at", nowIso).gte("ends_at", nowIso),
  ]);
  const failed = [pending, published, payments, paid, active].find((r) => r.error);
  if (failed) return json({ error: "Could not load the overview from the database." }, 502);

  let revenue = 0;
  let partial = false;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await db.from("orders").select("price_usd").eq("status", "paid").order("created_at", { ascending: true }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) return json({ error: "Could not load revenue from the database." }, 502);
    const rows = (data ?? []) as Array<{ price_usd: number | string }>;
    revenue += rows.reduce((s, r) => s + Number(r.price_usd), 0);
    if (rows.length < PAGE) break;
    if (page === MAX_PAGES - 1) partial = true;
  }

  return json({
    pendingSubmissions: pending.count ?? 0,
    publishedListings: published.count ?? 0,
    pendingPayments: payments.count ?? 0,
    paidOrders: paid.count ?? 0,
    grossPaidRevenueUsd: Math.round(revenue * 100) / 100,
    revenuePartial: partial,
    activeCampaigns: active.count ?? 0,
  });
}
