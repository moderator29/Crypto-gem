import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBoostPack } from "@/lib/ads/catalog";
import { boostWindow } from "@/lib/boost";

/**
 * Runs the product side effects once an order is verified paid.
 * Each branch is guarded by the current status so a repeat call is harmless.
 */
export async function fulfilOrder(db: SupabaseClient, order: { id: string; kind: string; ref_id: string }): Promise<void> {
  const now = new Date();
  if (order.kind === "listing") {
    await db.from("token_submissions").update({ status: "pending_review", updated_at: now.toISOString() }).eq("id", order.ref_id).eq("status", "awaiting_payment");
    return;
  }
  if (order.kind === "boost") {
    const { data: camp } = await db.from("boost_campaigns").select("id,submission_id,pack_id,status").eq("id", order.ref_id).maybeSingle();
    if (!camp || camp.status !== "awaiting_payment") return;
    const { data: pack } = await db.from("boost_packs").select("duration_hours").eq("id", camp.pack_id).maybeSingle();
    const hours = pack?.duration_hours ?? getBoostPack(camp.pack_id)?.hours;
    if (!hours) return;
    const { data: running } = await db.from("boost_campaigns").select("ends_at").eq("submission_id", camp.submission_id).eq("status", "active").gte("ends_at", now.toISOString());
    const w = boostWindow(hours, running ?? [], now);
    await db.from("boost_campaigns").update({ status: "active", starts_at: w.startsAt.toISOString(), ends_at: w.endsAt.toISOString() }).eq("id", camp.id).eq("status", "awaiting_payment");
    return;
  }
  if (order.kind === "ad_campaign") {
    await db.from("advertising_campaigns").update({ status: "pending_creative" }).eq("id", order.ref_id).eq("status", "awaiting_payment");
  }
}
