import { timingSafeEqual } from "node:crypto";
import { getNetwork } from "@/lib/market-data/networks";
import { geckoTerminal } from "@/lib/market-data/providers/geckoterminal";
import { notify } from "@/lib/notify";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Checks open price alerts against live prices, at most 25 distinct tokens per run to respect provider limits. */
async function checkAlerts(db: ReturnType<typeof supabaseAdmin>): Promise<number> {
  const { data: open } = await db.from("price_alerts").select("id,user_id,network_id,address,symbol,direction,price_usd").is("triggered_at", null).order("created_at", { ascending: true }).limit(300);
  const byToken = new Map<string, NonNullable<typeof open>>();
  for (const a of open ?? []) byToken.set(`${a.network_id}|${a.address}`, [...(byToken.get(`${a.network_id}|${a.address}`) ?? []), a]);
  let fired = 0;
  for (const [key, alerts] of [...byToken].slice(0, 25)) {
    const [net, address] = key.split("|") as [string, string];
    const slug = getNetwork(net)?.geckoterminal;
    if (!slug) continue;
    let price: number | null = null;
    try {
      price = (await geckoTerminal.token(slug, address)).priceUsd;
    } catch {
      continue;
    }
    if (price === null) continue;
    for (const a of alerts) {
      const hit = a.direction === "above" ? price >= Number(a.price_usd) : price <= Number(a.price_usd);
      if (!hit) continue;
      const { data: done } = await db.from("price_alerts").update({ triggered_at: new Date().toISOString(), triggered_price: price }).eq("id", a.id).is("triggered_at", null).select("id");
      if (!done?.length) continue;
      fired += 1;
      await notify(db, a.user_id, "alert", `${a.symbol ?? "Token"} crossed your price`, `${a.symbol ?? "Token"} is ${a.direction} $${Number(a.price_usd)} at $${price}.`, `/token/${net}/${address}`);
    }
  }
  return fired;
}

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !given) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Scheduled housekeeping, safe to run every few minutes and to run twice.
 * Public visibility already depends on time windows, so this keeps stored
 * statuses honest for dashboards and reports; it is not what hides expired ads.
 */
async function run(req: Request) {
  if (!authorised(req)) return new Response("unauthorised", { status: 401 });
  if (!supabaseConfigured()) return Response.json({ error: "Not configured" }, { status: 503 });
  const db = supabaseAdmin();
  const now = new Date().toISOString();
  const [boosts, ads, orders, scheduled] = await Promise.all([
    db.from("boost_campaigns").update({ status: "expired" }).eq("status", "active").lt("ends_at", now).select("id"),
    db.from("advertising_campaigns").update({ status: "completed" }).eq("status", "active").lt("ends_at", now).select("id"),
    db.from("orders").update({ status: "expired" }).eq("status", "pending").lt("created_at", new Date(Date.now() - 48 * 3_600_000).toISOString()).select("id"),
    db.from("advertising_campaigns").update({ status: "active" }).eq("status", "scheduled").lte("starts_at", now).gt("ends_at", now).select("id"),
  ]);
  // Paid campaigns whose creatives are all approved move to scheduled (or active if already inside their window).
  let promoted = 0;
  const { data: waiting } = await db.from("advertising_campaigns").select("id,starts_at,ends_at").eq("status", "pending_creative");
  for (const c of waiting ?? []) {
    const { data: cr } = await db.from("campaign_creatives").select("review_status,variant").eq("campaign_id", c.id);
    const desktop = cr?.find((x) => x.variant === "desktop");
    if (desktop?.review_status !== "approved" || cr?.some((x) => x.review_status === "rejected")) continue;
    const live = c.starts_at <= now && c.ends_at > now;
    await db.from("advertising_campaigns").update({ status: live ? "active" : "scheduled" }).eq("id", c.id).eq("status", "pending_creative");
    promoted += 1;
  }
  const alertsTriggered = await checkAlerts(db);
  return Response.json({ alertsTriggered, campaignsApproved: promoted, boostsExpired: boosts.data?.length ?? 0, adsCompleted: ads.data?.length ?? 0, ordersExpired: orders.data?.length ?? 0, adsActivated: scheduled.data?.length ?? 0 });
}

/** Vercel Cron calls with GET and a Bearer CRON_SECRET; external schedulers may use POST. Same handler, same auth. */
export const GET = run;
export const POST = run;
