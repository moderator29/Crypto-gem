import { z } from "zod";
import { getBoostPack } from "@/lib/ads/catalog";
import { supabaseAdmin, supabaseConfigured, userFromRequest } from "@/lib/supabase/admin";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

const body = z.object({ submissionId: z.string().uuid(), packId: z.string().min(2).max(30) });

/**
 * Creates a boost and its pending order, then returns the order id. The buyer picks the asset on the payment page. The server re-checks
 * that the project is published (eligibility) and takes the price from the
 * database. Any listed project can be boosted by any signed-in user, because
 * boosting only adds visibility; ownership is not required to promote a token.
 */
export async function POST(req: Request) {
  if (!supabaseConfigured()) return Response.json({ error: "Checkout is not live yet. See SETUP.md." }, { status: 503 });
  if (!rateLimit(`boost:${clientKey(req)}`, 10, 60_000).ok) return Response.json({ error: "Too many requests" }, { status: 429 });
  const user = await userFromRequest(req);
  if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 422 });
  const { submissionId, packId } = parsed.data;

  const db = supabaseAdmin();
  const { data: sub } = await db.from("token_submissions").select("id").eq("id", submissionId).eq("status", "published").maybeSingle();
  if (!sub) return Response.json({ error: "Only listed projects can be boosted. List the project first." }, { status: 409 });
  const { data: pack } = await db.from("boost_packs").select("id,price_usd,active").eq("id", packId).maybeSingle();
  const price = pack ? (pack.active ? Number(pack.price_usd) : null) : (getBoostPack(packId)?.priceUsd ?? null);
  if (price === null) return Response.json({ error: "Pack unavailable" }, { status: 400 });

  const { data: campaign, error: cErr } = await db.from("boost_campaigns").insert({ owner_id: user.id, submission_id: submissionId, pack_id: packId, status: "awaiting_payment" }).select("id").single();
  if (cErr) return Response.json({ error: "Could not create the boost" }, { status: 500 });
  const { data: order, error: oErr } = await db.from("orders").insert({ user_id: user.id, kind: "boost", ref_id: campaign.id, price_usd: price }).select("id").single();
  if (oErr) return Response.json({ error: "Could not create the order" }, { status: 500 });
  return Response.json({ orderId: order.id });
}
