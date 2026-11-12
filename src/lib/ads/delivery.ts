import "server-only";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { ACTIVE_BANNERS, type StaticBanner } from "@/data/sponsored";
import type { PlacementId } from "./catalog";

export interface ActiveCampaign {
  id: string;
  placement: PlacementId;
  projectName: string;
  headline: string | null;
  creativeDesktop: string;
  creativeMobile: string | null;
  /** Direct https destination. Set for banners from src/data/sponsored.ts, which have no click tracking row. */
  url?: string;
}

const ROTATION_MS = 12_000;

export function creativeUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/creatives/${path}`;
}

function rotate<T>(list: T[], now: Date): T[] {
  if (list.length < 2) return list;
  const shift = Math.floor(now.getTime() / ROTATION_MS) % list.length;
  return [...list.slice(shift), ...list.slice(0, shift)];
}

const isHttps = (u: string): boolean => {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
};

/** Banners from src/data/sponsored.ts for one placement (hero when none is set) that have not ended. */
export function staticCampaigns(placement: PlacementId, now = new Date(), list: StaticBanner[] = ACTIVE_BANNERS): ActiveCampaign[] {
  const out = list
    .filter((b) => (b.placement ?? "hero") === placement)
    .filter((b) => {
      const end = Date.parse(b.endsAt);
      return Number.isFinite(end) && end > now.getTime() && isHttps(b.url) && (b.image.startsWith("/") || isHttps(b.image));
    })
    .map((b) => ({ id: b.id, placement, projectName: b.name, headline: b.name, creativeDesktop: b.image, creativeMobile: null, url: b.url }));
  return rotate(out, now);
}

/** The https destination of a static banner by id, for the click redirect when there is no database. */
export function staticBannerUrl(id: string, now = new Date()): string | null {
  const b = ACTIVE_BANNERS.find((x) => x.id === id);
  if (!b || Date.parse(b.endsAt) <= now.getTime() || !isHttps(b.url)) return null;
  return b.url;
}

/**
 * Approved, paid campaigns whose window includes now, for one placement.
 * Order rotates by time bucket so every advertiser gets first position in
 * turn. An empty list means the slot is genuinely available. Without a database the list comes
 * from src/data/sponsored.ts.
 */
export async function getActiveCampaigns(placement: PlacementId, now = new Date()): Promise<ActiveCampaign[]> {
  if (!supabaseConfigured()) return staticCampaigns(placement, now);
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
    return rotate(out, now);
  } catch {
    return [];
  }
}
