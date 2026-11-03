import { z } from "zod";
import { notify } from "@/lib/notify";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ACCESS } from "@/lib/admin/roles";
import { auditOrFail, guard, json, parseBody } from "@/lib/admin/route";
import { checkTransition, LISTING_ACTIONS, LISTING_STATUSES } from "@/lib/admin/transitions";

export const dynamic = "force-dynamic";

const QUEUE_COLUMNS = "id,owner_id,name,symbol,network_id,address,mode,status,verification,rejection_reason,created_at,updated_at,published_at";

const query = z.object({
  status: z.string().optional(),
  id: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

/**
 * Review queue. `?status=a,b` filters (default: submitted and pending_review, `all` for no filter).
 * `?id=<uuid>` returns one submission with its detected snapshot, reviewer notes and listing orders.
 */
export async function GET(req: Request) {
  const auth = await guard(req, ACCESS.listingsRead);
  if (!auth.ok) return auth.response;
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return json({ error: "Invalid query" }, 422);
  const { status, id, limit, offset } = parsed.data;
  const db = supabaseAdmin();

  if (id) {
    const { data: submission, error } = await db.from("token_submissions").select("*").eq("id", id).maybeSingle();
    if (error) return json({ error: "Could not load the submission." }, 502);
    if (!submission) return json({ error: "Submission not found" }, 404);
    const [notes, orders] = await Promise.all([
      db.from("moderation_notes").select("id,author,kind,note,created_at").eq("submission_id", id).order("created_at", { ascending: false }).limit(100),
      db.from("orders").select("id,status,price_usd,created_at,paid_at").eq("kind", "listing").eq("ref_id", id).order("created_at", { ascending: false }),
    ]);
    if (notes.error || orders.error) return json({ error: "Could not load the submission history." }, 502);
    return json({ submission, notes: notes.data ?? [], orders: orders.data ?? [] });
  }

  const wanted = status === "all" ? null : (status ? status.split(",") : ["submitted", "pending_review"]).map((s) => s.trim());
  if (wanted && wanted.some((s) => !(LISTING_STATUSES as readonly string[]).includes(s))) return json({ error: "Unknown status filter" }, 422);
  let q = db.from("token_submissions").select(QUEUE_COLUMNS, { count: "exact" });
  if (wanted) q = q.in("status", wanted);
  const { data, count, error } = await q.order("updated_at", { ascending: true }).range(offset, offset + limit - 1);
  if (error) return json({ error: "Could not load the queue." }, 502);
  return json({ items: data ?? [], total: count ?? 0 });
}

const action = z.object({
  id: z.uuid(),
  action: z.enum(LISTING_ACTIONS),
  reason: z.string().trim().max(2000).optional(),
});

/** Apply one reviewer action. Legality comes from the transition table; the update is guarded on the status we read. */
export async function POST(req: Request) {
  const auth = await guard(req, ACCESS.listingsWrite, "write");
  if (!auth.ok) return auth.response;
  const body = await parseBody(req, action);
  if (!body.ok) return body.response;
  const { id, action: act, reason } = body.data;
  const db = supabaseAdmin();

  const { data: before, error: readErr } = await db.from("token_submissions").select("id,status,rejection_reason,published_at,owner_id,name").eq("id", id).maybeSingle();
  if (readErr) return json({ error: "Could not load the submission." }, 502);
  if (!before) return json({ error: "Submission not found" }, 404);

  const check = checkTransition(act, before.status as string, reason);
  if (!check.ok) return json({ error: check.error }, check.error === "A reason is required." ? 422 : 409);

  if (act === "publish") {
    const { data: paid, error } = await db.from("orders").select("id").eq("kind", "listing").eq("ref_id", id).eq("status", "paid").limit(1);
    if (error) return json({ error: "Could not verify payment." }, 502);
    if (!paid || paid.length === 0) return json({ error: "This listing has no paid order, so it cannot be published." }, 409);
  }

  let after: Record<string, unknown> = { status: before.status, rejection_reason: before.rejection_reason };
  if (check.to) {
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: check.to, updated_at: now };
    if (act === "reject" || act === "request_changes") patch.rejection_reason = reason;
    if (act === "approve") patch.rejection_reason = null;
    if (act === "publish" && !before.published_at) patch.published_at = now;
    const { data: updated, error } = await db.from("token_submissions").update(patch).eq("id", id).eq("status", before.status).select("id,status");
    if (error) return json({ error: "Could not update the submission." }, 502);
    if (!updated || updated.length !== 1) return json({ error: "Someone else changed this listing. Reload and try again." }, 409);
    after = { status: check.to, rejection_reason: (patch.rejection_reason as string | null | undefined) ?? before.rejection_reason };
  }

  if (reason) {
    const { error } = await db.from("moderation_notes").insert({ submission_id: id, author: auth.actor.id, kind: act, note: reason });
    if (error) {
      const failed = await auditOrFail(auth.actor, `listing.${act}`, `token_submissions:${id}`, { status: before.status }, { ...after, note_saved: false });
      return failed ?? json({ error: "The action was applied but the note could not be saved.", applied: true }, 500);
    }
  }

  const TITLES: Record<string, string> = { approve: "Listing approved", publish: "Listing is live", reject: "Listing rejected", request_changes: "Changes requested" };
  if (TITLES[act] && before.owner_id) await notify(db, before.owner_id as string, "listing", TITLES[act], `${before.name ?? "Your listing"}${reason ? `: ${reason}` : ""}`, "/dashboard/listings");
  const failed = await auditOrFail(auth.actor, `listing.${act}`, `token_submissions:${id}`, { status: before.status, rejection_reason: before.rejection_reason }, { ...after, ...(reason ? { reason } : {}) });
  if (failed) return failed;
  return json({ ok: true, status: after.status });
}
