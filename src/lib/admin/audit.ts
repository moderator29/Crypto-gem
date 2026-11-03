import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Append one row to `admin_audit_logs`. Every mutating admin route calls this after
 * its change succeeds. Throws if the row cannot be written so the route can surface it.
 */
export async function writeAudit(actor: { id: string }, action: string, target: string | null, before: unknown, after: unknown): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("admin_audit_logs")
    .insert({ actor_id: actor.id, action, target, before: before ?? null, after: after ?? null });
  if (error) throw new Error("audit write failed");
}
