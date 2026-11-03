import { priceFor } from "@/lib/ads/availability";
import { findSlot, loadPlacement } from "@/lib/ads/booking";
import { getDb, dbConfigured } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";
const DAY = 86_400_000;

/** Tells the booking wizard whether the chosen dates are free and what they cost. Read only. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const start = Date.parse(u.searchParams.get("start") ?? "");
  const days = Number(u.searchParams.get("days"));
  const id = u.searchParams.get("placement") ?? "";
  if (!Number.isFinite(start) || !Number.isInteger(days) || days < 1 || days > 30) return Response.json({ error: "Invalid dates" }, { status: 400 });
  if (!rateLimit(`avail:${clientKey(req)}`, 60, 60_000).ok) return Response.json({ error: "Too many requests" }, { status: 429 });
  if (!dbConfigured()) return Response.json({ configured: false });
  const p = await loadPlacement(getDb(), id);
  if (!p || !p.active) return Response.json({ error: "Unknown placement" }, { status: 404 });
  const price = priceFor(p.prices, days);
  if (price === null) return Response.json({ available: false, reason: "That duration is not offered for this placement", price: null });
  const r = await findSlot(getDb(), p, start, start + days * DAY);
  return Response.json({ configured: true, available: r.ok, reason: r.ok ? null : r.reason, price });
}
