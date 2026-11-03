import { supabaseAdmin, supabaseConfigured, userFromRequest } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Everything a project owner manages, in one call, scoped to the signed-in user. Stats are counted from stored events, never estimated. */
export async function GET(req: Request) {
  if (!supabaseConfigured()) return Response.json({ error: "Not configured" }, { status: 503 });
  const user = await userFromRequest(req);
  if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const db = supabaseAdmin();

  const [subs, orders, boosts, camps] = await Promise.all([
    db.from("token_submissions").select("id,name,symbol,network_id,address,status,rejection_reason,created_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(50),
    db.from("orders").select("id,kind,price_usd,status,created_at,paid_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    db.from("boost_campaigns").select("id,submission_id,pack_id,status,starts_at,ends_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(50),
    db.from("advertising_campaigns").select("id,placement_id,status,starts_at,ends_at,headline").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(50),
  ]);

  const ids = (camps.data ?? []).map((c) => c.id);
  const stats: Record<string, { impressions: number; clicks: number }> = {};
  if (ids.length) {
    const { data: events } = await db.from("ad_events").select("campaign_id,kind").in("campaign_id", ids).limit(50_000);
    for (const e of events ?? []) {
      const s = (stats[e.campaign_id] ??= { impressions: 0, clicks: 0 });
      if (e.kind === "impression") s.impressions += 1;
      else s.clicks += 1;
    }
  }
  const names = new Map((subs.data ?? []).map((s) => [s.id, s.name]));
  return Response.json({
    email: user.email,
    submissions: subs.data ?? [],
    orders: orders.data ?? [],
    boosts: (boosts.data ?? []).map((b) => ({ ...b, projectName: names.get(b.submission_id) ?? null })),
    campaigns: (camps.data ?? []).map((c) => ({ ...c, ...(stats[c.id] ?? { impressions: 0, clicks: 0 }) })),
  });
}
