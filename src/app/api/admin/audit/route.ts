import { z } from "zod";
import { getDb } from "@/lib/db";
import { ACCESS } from "@/lib/admin/roles";
import { guard, json } from "@/lib/admin/route";

export const dynamic = "force-dynamic";

const query = z.object({
  action: z.string().trim().regex(/^[a-z_.]{1,60}$/).optional(),
  actor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

/** Most recent audit entries first. Filters are exact matches. */
export async function GET(req: Request) {
  const auth = await guard(req, ACCESS.audit);
  if (!auth.ok) return auth.response;
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return json({ error: "Invalid filters" }, 422);
  const { action, actor, limit, offset } = parsed.data;
  let qb = getDb().from("admin_audit_logs").select("id,actor_id,action,target,before,after,created_at", { count: "exact" });
  if (action) qb = qb.eq("action", action);
  if (actor) qb = qb.eq("actor_id", actor);
  const { data, count, error } = await qb.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (error) return json({ error: "Could not load the audit log." }, 502);
  return json({ items: data ?? [], total: count ?? 0 });
}
