import { getDb } from "@/lib/db";
import { ACCESS } from "@/lib/admin/roles";
import { HAS_UPDATED_AT, priceUpdate } from "@/lib/admin/pricing";
import { auditOrFail, guard, json, parseBody } from "@/lib/admin/route";

export const dynamic = "force-dynamic";

/** Every catalog row, active or not. Listing packages, boost packs and advertising placements. */
export async function GET(req: Request) {
  const auth = await guard(req, ACCESS.pricesRead);
  if (!auth.ok) return auth.response;
  const db = getDb();
  const [packages, boosts, placements] = await Promise.all([
    db.from("listing_packages").select("*").order("sort"),
    db.from("boost_packs").select("*").order("sort"),
    db.from("advertising_placements").select("*").order("id"),
  ]);
  if (packages.error || boosts.error || placements.error) return json({ error: "Could not load prices." }, 502);
  return json({ listing_packages: packages.data ?? [], boost_packs: boosts.data ?? [], advertising_placements: placements.data ?? [] });
}

/** Update one catalog row. Numbers are validated, the before and after rows are audited. */
export async function PUT(req: Request) {
  const body = await parseBody(req, priceUpdate);
  // The required role depends on the table, so the body is parsed first. Auth still runs before any
  // validation error is returned or any database access happens.
  const roles = body.ok && body.data.table === "advertising_placements" ? ACCESS.pricesPlacements : ACCESS.pricesCatalog;
  const auth = await guard(req, roles, "write");
  if (!auth.ok) return auth.response;
  if (!body.ok) return body.response;
  const { table, id, patch } = body.data;
  const db = getDb();

  const { data: before, error: readErr } = await db.from(table).select("*").eq("id", id).maybeSingle();
  if (readErr) return json({ error: "Could not load the row." }, 502);
  if (!before) return json({ error: "Unknown id" }, 404);

  const update = HAS_UPDATED_AT[table] ? { ...patch, updated_at: new Date().toISOString() } : patch;
  const { data: after, error } = await db.from(table).update(update).eq("id", id).select("*").maybeSingle();
  if (error || !after) return json({ error: "Could not save the change." }, 502);

  const failed = await auditOrFail(auth.actor, `prices.${table}.update`, `${table}:${id}`, before, after);
  if (failed) return failed;
  return json({ ok: true, row: after });
}
