import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { dedupeKey, deviceOf, isBot } from "@/lib/ads/track";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

/** Records one unique impression per visitor per campaign per hour. Bots and repeats are dropped silently. */
export async function POST(req: Request) {
  if (!supabaseConfigured()) return new Response(null, { status: 204 });
  const ip = clientKey(req);
  if (!rateLimit(`imp:${ip}`, 120, 60_000).ok) return new Response(null, { status: 204 });
  const ua = req.headers.get("user-agent");
  if (isBot(ua)) return new Response(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { c?: string } | null;
  if (!body?.c || !/^[0-9a-f-]{36}$/i.test(body.c)) return new Response(null, { status: 400 });
  await supabaseAdmin().from("ad_events").insert({ campaign_id: body.c, kind: "impression", device: deviceOf(ua), dedupe_key: dedupeKey("impression", ip, ua ?? "") });
  return new Response(null, { status: 204 });
}
