import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userGuard } from "@/lib/user-route";

export const dynamic = "force-dynamic";

const body = z.object({ label: z.string().max(60).nullish(), locale: z.string().max(10).nullish() });

/**
 * Creates the signed-in user's profile row on first contact and stamps last seen afterwards.
 * Identity comes only from the verified Privy token. The label is a display hint and is never used for access.
 */
export async function POST(req: Request) {
  const g = await userGuard(req, "sync");
  if (!("user" in g)) return g.res;
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  const label = parsed.success ? parsed.data.label ?? null : null;
  const db = supabaseAdmin();
  const { data: existing } = await db.from("profiles").select("id").eq("id", g.user.id).maybeSingle();
  if (existing) {
    await db.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", g.user.id);
    return Response.json({ created: false });
  }
  const { error } = await db.from("profiles").insert({ id: g.user.id, display_name: label, locale: parsed.success && parsed.data.locale ? parsed.data.locale : "en" });
  if (error) return Response.json({ error: "Could not create the profile." }, { status: 502 });
  return Response.json({ created: true });
}
