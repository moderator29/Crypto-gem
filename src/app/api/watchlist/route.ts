import { z } from "zod";
import { classifyAddress, normalizeAddress } from "@/lib/market-data/identifiers";
import { getNetwork } from "@/lib/market-data/networks";
import { geckoTerminal } from "@/lib/market-data/providers/geckoterminal";
import { supabaseAdmin, supabaseConfigured, userFromRequest } from "@/lib/supabase/admin";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

const item = z.object({ network: z.string().min(2).max(30), address: z.string().min(10).max(128) });
const MAX_ITEMS = 100;

async function defaultList(userId: string): Promise<string> {
  const db = supabaseAdmin();
  const { data } = await db.from("watchlists").select("id").eq("user_id", userId).eq("name", "Favourites").maybeSingle();
  if (data) return data.id;
  const { data: created } = await db.from("watchlists").insert({ user_id: userId, name: "Favourites" }).select("id").single();
  return created!.id;
}

function valid(network: string, address: string): { network: string; address: string } | null {
  const n = getNetwork(network);
  const k = classifyAddress(address);
  if (!n?.contractLookup || k === "unknown" || k === "bitcoin") return null;
  return { network: n.id, address: normalizeAddress(address) };
}

async function guard(req: Request) {
  if (!supabaseConfigured()) return { res: Response.json({ error: "Accounts are not connected yet." }, { status: 503 }) };
  if (!rateLimit(`wl:${clientKey(req)}`, 60, 60_000).ok) return { res: Response.json({ error: "Too many requests" }, { status: 429 }) };
  const user = await userFromRequest(req);
  if (!user) return { res: Response.json({ error: "Sign in to use your watchlist." }, { status: 401 }) };
  return { user };
}

/** The watchlist with live prices. Prices are fetched for at most 20 items per call to respect provider limits. */
export async function GET(req: Request) {
  const g = await guard(req);
  if (!g.user) return g.res;
  const db = supabaseAdmin();
  const id = await defaultList(g.user.id);
  const { data } = await db.from("watchlist_items").select("network_id,address,added_at").eq("watchlist_id", id).order("added_at", { ascending: false }).limit(MAX_ITEMS);
  const items = data ?? [];
  const live = await Promise.all(
    items.slice(0, 20).map(async (i) => {
      const slug = getNetwork(i.network_id)?.geckoterminal;
      if (!slug) return null;
      try {
        const t = await geckoTerminal.token(slug, i.address);
        return { priceUsd: t.priceUsd, name: t.identity?.name ?? null, symbol: t.identity?.symbol ?? null, imageUrl: t.identity?.imageUrl ?? null, liquidityUsd: t.liquidityUsd };
      } catch {
        return null;
      }
    }),
  );
  return Response.json({ items: items.map((i, idx) => ({ network: i.network_id, address: i.address, addedAt: i.added_at, live: live[idx] ?? null })) });
}

export async function POST(req: Request) {
  const g = await guard(req);
  if (!g.user) return g.res;
  const parsed = item.safeParse(await req.json().catch(() => null));
  const v = parsed.success ? valid(parsed.data.network, parsed.data.address) : null;
  if (!v) return Response.json({ error: "Invalid token" }, { status: 422 });
  const db = supabaseAdmin();
  const id = await defaultList(g.user.id);
  const { count } = await db.from("watchlist_items").select("*", { count: "exact", head: true }).eq("watchlist_id", id);
  if ((count ?? 0) >= MAX_ITEMS) return Response.json({ error: `Watchlist is full (${MAX_ITEMS})` }, { status: 409 });
  await db.from("watchlist_items").upsert({ watchlist_id: id, network_id: v.network, address: v.address }, { onConflict: "watchlist_id,network_id,address" });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const g = await guard(req);
  if (!g.user) return g.res;
  const u = new URL(req.url);
  const v = valid(u.searchParams.get("network") ?? "", u.searchParams.get("address") ?? "");
  if (!v) return Response.json({ error: "Invalid token" }, { status: 422 });
  const id = await defaultList(g.user.id);
  await supabaseAdmin().from("watchlist_items").delete().eq("watchlist_id", id).eq("network_id", v.network).eq("address", v.address);
  return Response.json({ ok: true });
}
