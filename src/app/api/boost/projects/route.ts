import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { getNetwork } from "@/lib/market-data/networks";

export const dynamic = "force-dynamic";

const PAGE = 20;

/** Listed (published) projects eligible for a boost, with their current boost state. Nothing is fabricated: no database means no list. */
export async function GET(req: Request) {
  if (!supabaseConfigured()) return Response.json({ configured: false, projects: [], total: 0 });
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") ?? "").trim().slice(0, 60).replace(/[%,()]/g, "");
  const network = u.searchParams.get("network");
  const page = Math.max(1, Math.min(500, Number(u.searchParams.get("page") ?? 1) || 1));
  if (network && !getNetwork(network)) return Response.json({ error: "Unknown network" }, { status: 400 });

  const db = supabaseAdmin();
  let query = db.from("token_submissions").select("id,name,symbol,network_id,address,logo_url,verification", { count: "exact" }).eq("status", "published");
  if (network) query = query.eq("network_id", network);
  if (q) query = query.or(`name.ilike.%${q}%,symbol.ilike.%${q}%,address.ilike.%${q}%`);
  const { data, count, error } = await query.order("published_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (error) return Response.json({ error: "Could not load projects" }, { status: 502 });

  const ids = (data ?? []).map((p) => p.id);
  const now = new Date().toISOString();
  const { data: boosts } = ids.length
    ? await db.from("boost_campaigns").select("submission_id,ends_at").in("submission_id", ids).eq("status", "active").lte("starts_at", now).gte("ends_at", now)
    : { data: [] as Array<{ submission_id: string; ends_at: string }> };
  const boosted = new Map((boosts ?? []).map((b) => [b.submission_id, b.ends_at]));
  return Response.json({ configured: true, total: count ?? 0, page, pageSize: PAGE, projects: (data ?? []).map((p) => ({ ...p, boostEndsAt: boosted.get(p.id) ?? null })) });
}
