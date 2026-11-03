import { randomUUID } from "node:crypto";
import { PLACEMENTS, getPlacement } from "@/lib/ads/catalog";
import { priceFor } from "@/lib/ads/availability";
import { findSlot, loadPlacement } from "@/lib/ads/booking";
import { checkCreative, inspectImage } from "@/lib/ads/image";
import { CheckoutError, createPaymentForOrder } from "@/lib/payments/checkout";
import { isConfigured } from "@/lib/payments/nowpayments";
import { getDb, dbConfigured, userFromRequest } from "@/lib/db";
import { putImage, storageConfigured } from "@/lib/storage";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

const EXT = { jpeg: "jpg", png: "png", webp: "webp" } as const;
const DAY = 86_400_000;

function fail(error: string, status = 422) {
  return Response.json({ error }, { status });
}

/**
 * Books an ad campaign. Multipart: placement, days, start (ISO date),
 * destination (https), headline, payCurrency, desktop file, optional mobile file.
 * Price, availability, creative checks and slot allocation are all decided here.
 */
export async function POST(req: Request) {
  if (!dbConfigured() || !storageConfigured() || !isConfigured()) return fail("Booking is not live yet. See SETUP.md.", 503);
  if (!rateLimit(`book:${clientKey(req)}`, 8, 60_000).ok) return fail("Too many requests", 429);
  const user = await userFromRequest(req);
  if (!user) return fail("Sign in to continue.", 401);

  const form = await req.formData().catch(() => null);
  if (!form) return fail("Invalid form");
  const text = (k: string) => String(form.get(k) ?? "").trim();
  const placement = getPlacement(text("placement"));
  const days = Number(text("days"));
  const start = Date.parse(text("start"));
  const destination = text("destination");
  const headline = text("headline").slice(0, 80);
  const payCurrency = text("payCurrency");
  const desktop = form.get("desktop");
  const mobile = form.get("mobile");

  if (!placement || !PLACEMENTS.some((p) => p.id === placement.id)) return fail("Unknown placement");
  if (!Number.isInteger(days) || days < 1 || days > 30) return fail("Invalid duration");
  if (!Number.isFinite(start) || start < Date.now() - DAY) return fail("Choose a start date that is today or later");
  if (start > Date.now() + 120 * DAY) return fail("Start date is too far ahead");
  try {
    if (new URL(destination).protocol !== "https:") throw new Error("scheme");
  } catch {
    return fail("Destination must be a valid https URL");
  }
  if (!/^[a-z0-9]{2,20}$/.test(payCurrency)) return fail("Choose a payment option");
  if (!(desktop instanceof File)) return fail("Upload a desktop creative");

  const db = getDb();
  const eff = await loadPlacement(db, placement.id);
  if (!eff || !eff.active) return fail("That placement is not available");
  const price = priceFor(eff.prices, days);
  if (price === null) return fail("That duration is not offered for this placement");

  const files: Array<{ variant: "desktop" | "mobile"; bytes: Uint8Array; info: NonNullable<ReturnType<typeof inspectImage>> }> = [];
  for (const [variant, f, rec] of [["desktop", desktop, eff.desktop], ["mobile", mobile, eff.mobile]] as const) {
    if (!(f instanceof File) || f.size === 0) continue;
    const bytes = new Uint8Array(await f.arrayBuffer());
    const info = inspectImage(bytes);
    const check = checkCreative(info, bytes.length, rec);
    if (!check.ok || !info) return fail(`${variant === "desktop" ? "Desktop" : "Mobile"} creative: ${check.error}`);
    files.push({ variant, bytes, info });
  }

  const startsAt = start;
  const endsAt = start + days * DAY;
  const alloc = await findSlot(db, eff, startsAt, endsAt);
  if (!alloc.ok) return fail(alloc.reason, 409);

  const campaignId = randomUUID();
  const { error: cErr } = await db.from("advertising_campaigns").insert({ id: campaignId, owner_id: user.id, placement_id: placement.id, headline: headline || null, destination_url: destination, starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString(), status: "awaiting_payment" });
  if (cErr) return fail("Could not create the campaign", 500);
  if (eff.exclusive && alloc.slot !== null) {
    const { error: rErr } = await db.from("exclusive_reservations").insert({ campaign_id: campaignId, placement_id: placement.id, slot: alloc.slot, during: `[${new Date(startsAt).toISOString()},${new Date(endsAt).toISOString()})` });
    if (rErr) {
      await db.from("advertising_campaigns").delete().eq("id", campaignId);
      return fail("That slot was just taken. Pick other dates.", 409);
    }
  }
  for (const f of files) {
    let url: string;
    try {
      url = await putImage(`creatives/${user.id}/${campaignId}-${f.variant}.${EXT[f.info.kind]}`, f.bytes, f.info.kind);
    } catch {
      return fail("Could not store the creative. Try again.", 502);
    }
    await db.from("campaign_creatives").insert({ campaign_id: campaignId, variant: f.variant, storage_path: url, width: f.info.width, height: f.info.height });
  }
  const { data: order, error: oErr } = await db.from("orders").insert({ user_id: user.id, kind: "ad_campaign", ref_id: campaignId, price_usd: price }).select("id").single();
  if (oErr) return fail("Could not create the order", 500);
  try {
    await createPaymentForOrder(user.id, order.id, payCurrency);
  } catch (e) {
    return Response.json({ orderId: order.id, warning: e instanceof CheckoutError ? e.message : "Payment could not be created yet. Retry from the payment page." });
  }
  return Response.json({ orderId: order.id });
}
