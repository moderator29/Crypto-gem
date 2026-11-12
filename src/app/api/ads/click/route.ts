import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { staticBannerUrl } from "@/lib/ads/delivery";
import { dedupeKey, deviceOf, isBot } from "@/lib/ads/track";
import { clientKey } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

/** Counts a click (deduplicated, bots skipped) and redirects to the advertiser's https destination. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("c") ?? "";
  if (!supabaseConfigured()) {
    // No database: banners come from the static list, which carries its own https destination.
    const url = staticBannerUrl(id);
    return url && url.startsWith("https://") ? Response.redirect(url, 302) : new Response("Not found", { status: 404 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const db = supabaseAdmin();
  const now = new Date().toISOString();
  const { data: c } = await db.from("advertising_campaigns").select("destination_url").eq("id", id).eq("status", "active").lte("starts_at", now).gte("ends_at", now).maybeSingle();
  if (!c || !String(c.destination_url).startsWith("https://")) return new Response("Not found", { status: 404 });
  const ua = req.headers.get("user-agent");
  if (!isBot(ua)) await db.from("ad_events").insert({ campaign_id: id, kind: "click", device: deviceOf(ua), dedupe_key: dedupeKey("click", clientKey(req), ua ?? "") });
  return Response.redirect(c.destination_url, 302);
}
