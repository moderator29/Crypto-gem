import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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
export async function POST(req: Request) {
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
  return Response.json({ campaignsApproved: promoted, boostsExpired: boosts.data?.length ?? 0, adsCompleted: ads.data?.length ?? 0, ordersExpired: orders.data?.length ?? 0, adsActivated: scheduled.data?.length ?? 0 });
}
