import { supabaseAdmin, supabaseConfigured, userFromRequest } from "@/lib/supabase/admin";
import { CheckoutError, createPaymentForOrder } from "@/lib/payments/checkout";
import { isConfigured as nowConfigured } from "@/lib/payments/nowpayments";
import { checkContract, listingInput, packagePriceUsd } from "@/lib/listings";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

/** Creates a submission, its order and a provider payment. Price is decided here, never by the client. */
export async function POST(req: Request) {
  const missing = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "NOWPAYMENTS_API_KEY", "NOWPAYMENTS_IPN_SECRET"].filter((k) => !process.env[k]);
  if (missing.length > 0 || !supabaseConfigured() || !nowConfigured()) {
    return Response.json({ error: `Checkout is not live yet. Missing server configuration: ${missing.join(", ")}. See SETUP.md.` }, { status: 503 });
  }
  const rl = rateLimit(`listing:${clientKey(req)}`, 10, 60_000);
  if (!rl.ok) return Response.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });

  const user = await userFromRequest(req);
  if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });

  const parsed = listingInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the form: " + parsed.error.issues.map((i) => i.path.join(".")).join(", ") }, { status: 422 });
  const input = parsed.data;
  const contract = checkContract(input.network, input.address);
  if (!contract.ok) return Response.json({ error: contract.error }, { status: 422 });

  const db = supabaseAdmin();
  const { data: pkg } = await db.from("listing_packages").select("price_usd,active").eq("id", input.package).maybeSingle();
  if (pkg && !pkg.active) return Response.json({ error: "Package unavailable" }, { status: 400 });
  const price = packagePriceUsd(input.package, pkg ? Number(pkg.price_usd) : null);
  if (price === null) return Response.json({ error: "Unknown package" }, { status: 400 });

  const f = input.form;
  const { data: sub, error: subErr } = await db.from("token_submissions").insert({
    owner_id: user.id, mode: input.mode, network_id: input.network, address: contract.address,
    name: f.name, symbol: f.symbol, logo_url: f.logoUrl || null, description: f.description, description_zh: f.descriptionZh || null,
    links: { website: f.website, twitter: f.twitter, telegram: f.telegram, discord: f.discord, medium: f.medium, coingecko: f.coingecko, coinmarketcap: f.coinmarketcap, contactEmail: f.email },
    status: "awaiting_payment",
  }).select("id").single();
  if (subErr) {
    return Response.json({ error: subErr.code === "23505" ? "This contract already has a live listing or submission." : "Could not save the submission." }, { status: subErr.code === "23505" ? 409 : 500 });
  }
  const { data: order, error: orderErr } = await db.from("orders").insert({ user_id: user.id, kind: "listing", ref_id: sub.id, price_usd: price }).select("id").single();
  if (orderErr) return Response.json({ error: "Could not create the order." }, { status: 500 });

  try {
    await createPaymentForOrder(user.id, order.id, input.payCurrency);
  } catch (e) {
    // The order exists; the user can retry payment from the payment page.
    if (!(e instanceof CheckoutError)) return Response.json({ orderId: order.id, warning: "Payment could not be created yet. Retry from the payment page." });
    return Response.json({ orderId: order.id, warning: e.message });
  }
  return Response.json({ orderId: order.id });
}
