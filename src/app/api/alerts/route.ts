import { z } from "zod";
import { classifyAddress, normalizeAddress } from "@/lib/market-data/identifiers";
import { getNetwork } from "@/lib/market-data/networks";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userGuard } from "@/lib/user-route";

export const dynamic = "force-dynamic";

const MAX_ALERTS = 50;
const create = z.object({
  network: z.string().min(2).max(30),
  address: z.string().min(10).max(128),
  symbol: z.string().min(1).max(30),
  name: z.string().max(100).nullish(),
  direction: z.enum(["above", "below"]),
  price: z.number().positive().finite(),
});

export async function GET(req: Request) {
  const g = await userGuard(req, "alerts");
  if (!("user" in g)) return g.res;
  const { data, error } = await supabaseAdmin().from("price_alerts").select("id,network_id,address,symbol,name,direction,price_usd,triggered_at,triggered_price,created_at").eq("user_id", g.user.id).order("created_at", { ascending: false }).limit(MAX_ALERTS);
  if (error) return Response.json({ error: "Could not load alerts." }, { status: 502 });
  return Response.json({ alerts: data ?? [] });
}

export async function POST(req: Request) {
  const g = await userGuard(req, "alerts");
  if (!("user" in g)) return g.res;
  const parsed = create.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the token and the price." }, { status: 422 });
  const d = parsed.data;
  const net = getNetwork(d.network);
  const kind = classifyAddress(d.address);
  if (!net?.geckoterminal || kind === "unknown" || kind === "bitcoin") return Response.json({ error: "Invalid token" }, { status: 422 });
  const db = supabaseAdmin();
  const { count } = await db.from("price_alerts").select("*", { count: "exact", head: true }).eq("user_id", g.user.id).is("triggered_at", null);
  if ((count ?? 0) >= MAX_ALERTS) return Response.json({ error: `You can keep ${MAX_ALERTS} open alerts.` }, { status: 409 });
  const { error } = await db.from("price_alerts").insert({ user_id: g.user.id, network_id: net.id, address: normalizeAddress(d.address), symbol: d.symbol, name: d.name ?? null, direction: d.direction, price_usd: d.price });
  if (error) return Response.json({ error: "Could not save the alert." }, { status: 502 });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const g = await userGuard(req, "alerts");
  if (!("user" in g)) return g.res;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!z.string().uuid().safeParse(id).success) return Response.json({ error: "Invalid alert" }, { status: 422 });
  await supabaseAdmin().from("price_alerts").delete().eq("id", id).eq("user_id", g.user.id);
  return Response.json({ ok: true });
}
