import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { allocate, type Booking } from "./availability";
import { getPlacement } from "./catalog";

export interface EffectivePlacement {
  id: string;
  prices: Record<string, number>;
  slots: number;
  exclusive: boolean;
  desktop: { w: number; h: number };
  mobile: { w: number; h: number };
  active: boolean;
}

/** Admin-managed row wins over the default catalog, so price and slot changes need no deploy. */
export async function loadPlacement(db: SupabaseClient, id: string): Promise<EffectivePlacement | null> {
  const def = getPlacement(id);
  if (!def) return null;
  const { data: row } = await db.from("advertising_placements").select("*").eq("id", id).maybeSingle();
  if (!row) return { id, prices: def.prices as Record<string, number>, slots: def.slots, exclusive: def.exclusive, desktop: def.desktop, mobile: def.mobile, active: true };
  return { id, prices: row.prices as Record<string, number>, slots: row.slots, exclusive: row.exclusive, desktop: { w: row.desktop_w, h: row.desktop_h }, mobile: { w: row.mobile_w, h: row.mobile_h }, active: row.active };
}

const LIVE = ["awaiting_payment", "pending_creative", "approved", "scheduled", "active", "paused"];

export async function findSlot(db: SupabaseClient, p: EffectivePlacement, startsAt: number, endsAt: number) {
  const { data: existing } = await db.from("advertising_campaigns").select("id,starts_at,ends_at").eq("placement_id", p.id).in("status", LIVE).lt("starts_at", new Date(endsAt).toISOString()).gt("ends_at", new Date(startsAt).toISOString());
  const { data: resv } = p.exclusive && existing?.length ? await db.from("exclusive_reservations").select("campaign_id,slot").in("campaign_id", existing.map((c) => c.id)) : { data: [] as Array<{ campaign_id: string; slot: number }> };
  const slotOf = new Map((resv ?? []).map((r) => [r.campaign_id, r.slot]));
  const bookings: Booking[] = (existing ?? []).map((c) => ({ start: Date.parse(c.starts_at), end: Date.parse(c.ends_at), slot: slotOf.get(c.id) ?? null }));
  return allocate({ slots: p.slots, exclusive: p.exclusive }, bookings, { start: startsAt, end: endsAt });
}
