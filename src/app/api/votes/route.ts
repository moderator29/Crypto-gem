import { z } from "zod";
import { classifyAddress, normalizeAddress } from "@/lib/market-data/identifiers";
import { getNetwork } from "@/lib/market-data/networks";
import { supabaseAdmin, supabaseConfigured, userFromRequest } from "@/lib/supabase/admin";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

const item = z.object({ network: z.string().min(2).max(30), address: z.string().min(10).max(128) });

function valid(network: string, address: string): { network: string; address: string } | null {
  const n = getNetwork(network);
  const k = classifyAddress(address);
  if (network === "cg" && /^[a-z0-9-]{1,80}$/.test(address)) return { network: "cg", address };
  if (!n || k === "unknown" || k === "bitcoin") return null;
  return { network: n.id, address: normalizeAddress(address) };
}

/** Vote totals for up to 100 tokens: `?keys=network:address,network:address`. Totals only, voters are never exposed. */
export async function GET(req: Request) {
  if (!supabaseConfigured()) return Response.json({ configured: false, counts: {} });
  if (!rateLimit(`votes-get:${clientKey(req)}`, 60, 60_000).ok) return Response.json({ error: "Too many requests" }, { status: 429 });
  const keys = (new URL(req.url).searchParams.get("keys") ?? "").split(",").slice(0, 100);
  const wanted = keys.map((k) => valid(k.slice(0, k.indexOf(":")), k.slice(k.indexOf(":") + 1))).filter((v): v is { network: string; address: string } => v !== null);
  if (wanted.length === 0) return Response.json({ configured: true, counts: {} });
  const { data } = await supabaseAdmin().from("token_votes").select("network_id,address").in("address", wanted.map((w) => w.address)).limit(20000);
  const counts: Record<string, number> = {};
  const set = new Set(wanted.map((w) => `${w.network}:${w.address}`));
  for (const r of data ?? []) {
    const k = `${r.network_id}:${r.address}`;
    if (set.has(k)) counts[k] = (counts[k] ?? 0) + 1;
  }
  return Response.json({ configured: true, counts });
}

/** One vote per signed-in user per token per day. Returns the new total, or says plainly why not. */
export async function POST(req: Request) {
  if (!supabaseConfigured()) return Response.json({ error: "Voting is not available yet." }, { status: 503 });
  if (!rateLimit(`votes:${clientKey(req)}`, 30, 60_000).ok) return Response.json({ error: "Too many requests" }, { status: 429 });
  const user = await userFromRequest(req);
  if (!user) return Response.json({ error: "Sign in to vote." }, { status: 401 });
  const parsed = item.safeParse(await req.json().catch(() => null));
  const v = parsed.success ? valid(parsed.data.network, parsed.data.address) : null;
  if (!v) return Response.json({ error: "Invalid token" }, { status: 422 });
  const db = supabaseAdmin();
  const { error } = await db.from("token_votes").insert({ user_id: user.id, network_id: v.network, address: v.address });
  if (error) return Response.json({ error: error.code === "23505" ? "You already voted for this token today." : "Could not record the vote." }, { status: error.code === "23505" ? 409 : 500 });
  const { count } = await db.from("token_votes").select("*", { count: "exact", head: true }).eq("network_id", v.network).eq("address", v.address);
  return Response.json({ ok: true, votes: count ?? 1 });
}
