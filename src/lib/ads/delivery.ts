import "server-only";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import type { PlacementId } from "./catalog";

export interface ActiveCampaign {
  id: string;
  placement: PlacementId;
  projectName: string;
  headline: string | null;
  creativeDesktop: string;
  creativeMobile: string | null;
}

const ROTATION_MS = 12_000;

export function creativeUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/creatives/${path}`;
}

/**
 * Approved, paid campaigns whose window includes now, for one placement.
 * Order rotates by time bucket so every advertiser gets first position in
 * turn. An empty list means the slot is genuinely available.
 */
export async function getActiveCampaigns(placement: PlacementId, now = new Date()): Promise<ActiveCampaign[]> {
  if (!supabaseConfigured()) return [];
  try {
    const db = supabaseAdmin();
    const iso = now.toISOString();
    const { data: camps } = await db.from("advertising_campaigns").select("id,headline,submission_id,created_at").eq("placement_id", placement).eq("status", "active").lte("starts_at", iso).gte("ends_at", iso).order("created_at");
    if (!camps?.length) return [];
    const { data: creatives } = await db.from("campaign_creatives").select("campaign_id,variant,storage_path").in("campaign_id", camps.map((c) => c.id)).eq("review_status", "approved");
    const out: ActiveCampaign[] = [];
    for (const c of camps) {
      const desktop = creatives?.find((x) => x.campaign_id === c.id && x.variant === "desktop");
      if (!desktop) continue;
      const mobile = creatives?.find((x) => x.campaign_id === c.id && x.variant === "mobile");
      out.push({ id: c.id, placement, projectName: c.headline ?? "Sponsored", headline: c.headline, creativeDesktop: creativeUrl(desktop.storage_path), creativeMobile: mobile ? creativeUrl(mobile.storage_path) : null });
    }
    if (out.length < 2) return out;
    const shift = Math.floor(now.getTime() / ROTATION_MS) % out.length;
    return [...out.slice(shift), ...out.slice(0, shift)];
  } catch {
    return [];
  }
}
