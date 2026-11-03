import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userGuard } from "@/lib/user-route";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await userGuard(req, "notif");
  if (!("user" in g)) return g.res;
  const { data, error } = await supabaseAdmin().from("notifications").select("id,kind,title,body,href,read_at,created_at").eq("user_id", g.user.id).order("created_at", { ascending: false }).limit(50);
  if (error) return Response.json({ error: "Could not load notifications." }, { status: 502 });
  return Response.json({ items: data ?? [], unread: (data ?? []).filter((n) => !n.read_at).length });
}

const read = z.object({ id: z.string().uuid().optional() });

/** Marks one notification, or all of the user's unread notifications when no id is given, as read. */
export async function POST(req: Request) {
  const g = await userGuard(req, "notif");
  if (!("user" in g)) return g.res;
  const parsed = read.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 422 });
  let q = supabaseAdmin().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", g.user.id).is("read_at", null);
  if (parsed.data.id) q = q.eq("id", parsed.data.id);
  await q;
  return Response.json({ ok: true });
}
