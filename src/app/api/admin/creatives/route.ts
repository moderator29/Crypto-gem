import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ACCESS } from "@/lib/admin/roles";
import { auditOrFail, guard, json, parseBody } from "@/lib/admin/route";

export const dynamic = "force-dynamic";

/** Creatives waiting for review, with the campaign they belong to. */
export async function GET(req: Request) {
  const auth = await guard(req, ACCESS.creatives);
  if (!auth.ok) return auth.response;
  const { data, error } = await supabaseAdmin()
    .from("campaign_creatives")
    .select("id,campaign_id,variant,storage_path,width,height,review_status,review_note,advertising_campaigns(id,owner_id,placement_id,headline,destination_url,starts_at,ends_at,status)")
    .eq("review_status", "pending")
    .limit(100);
  if (error) return json({ error: "Could not load creatives." }, 502);
  return json({ items: data ?? [] });
}

const decision = z
  .object({
    id: z.uuid(),
    decision: z.enum(["approve", "reject"]),
    note: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.decision === "approve" || (v.note && v.note.length >= 3), { path: ["note"], message: "a note is required when rejecting" });

/** Approve or reject one pending creative. Only a pending creative can be decided. */
export async function POST(req: Request) {
  const auth = await guard(req, ACCESS.creatives, "write");
  if (!auth.ok) return auth.response;
  const body = await parseBody(req, decision);
  if (!body.ok) return body.response;
  const { id, decision: verdict, note } = body.data;
  const db = supabaseAdmin();

  const { data: before, error: readErr } = await db.from("campaign_creatives").select("id,campaign_id,variant,review_status,review_note").eq("id", id).maybeSingle();
  if (readErr) return json({ error: "Could not load the creative." }, 502);
  if (!before) return json({ error: "Creative not found" }, 404);
  if (before.review_status !== "pending") return json({ error: `This creative is already ${before.review_status}.` }, 409);

  const next = verdict === "approve" ? "approved" : "rejected";
  const { data: updated, error } = await db.from("campaign_creatives").update({ review_status: next, review_note: note ?? null }).eq("id", id).eq("review_status", "pending").select("id");
  if (error) return json({ error: "Could not save the decision." }, 502);
  if (!updated || updated.length !== 1) return json({ error: "Someone else decided this creative. Reload and try again." }, 409);

  const failed = await auditOrFail(auth.actor, `creative.${verdict}`, `campaign_creatives:${id}`, { review_status: before.review_status, review_note: before.review_note }, { review_status: next, review_note: note ?? null });
  if (failed) return failed;
  return json({ ok: true, review_status: next });
}
