import { z } from "zod";
import { getDb } from "@/lib/db";
import { isConfigured, nowpayments } from "@/lib/payments/nowpayments";
import { ACCESS } from "@/lib/admin/roles";
import { auditOrFail, guard, json, parseBody } from "@/lib/admin/route";

export const dynamic = "force-dynamic";

/** Provider currency list, lowercased. `null` when the provider is not configured or did not answer. */
async function liveCurrencies(): Promise<{ set: Set<string> | null; status: "ok" | "unconfigured" | "unavailable" }> {
  if (!isConfigured()) return { set: null, status: "unconfigured" };
  try {
    return { set: new Set((await nowpayments.currencies()).map((c) => c.toLowerCase())), status: "ok" };
  } catch {
    return { set: null, status: "unavailable" };
  }
}

/** All methods, with whether the provider currently lists each one. */
export async function GET(req: Request) {
  const auth = await guard(req, ACCESS.paymentMethods);
  if (!auth.ok) return auth.response;
  const [{ data, error }, live] = await Promise.all([getDb().from("payment_methods").select("*").order("sort"), liveCurrencies()]);
  if (error) return json({ error: "Could not load payment methods." }, 502);
  const methods = ((data ?? []) as Array<{ provider_currency: string }>).map((m) => ({ ...m, providerListed: live.set ? live.set.has(m.provider_currency.toLowerCase()) : null }));
  return json({ providerStatus: live.status, methods });
}

const toggle = z.object({ id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/), enabled: z.boolean() });

/** Enable or disable a method. Enabling is refused unless the provider lists the currency right now. */
export async function PUT(req: Request) {
  const auth = await guard(req, ACCESS.paymentMethods, "write");
  if (!auth.ok) return auth.response;
  const body = await parseBody(req, toggle);
  if (!body.ok) return body.response;
  const { id, enabled } = body.data;
  const db = getDb();

  const { data: before, error: readErr } = await db.from("payment_methods").select("*").eq("id", id).maybeSingle();
  if (readErr) return json({ error: "Could not load the payment method." }, 502);
  if (!before) return json({ error: "Unknown payment method" }, 404);

  if (enabled) {
    const live = await liveCurrencies();
    if (live.status === "unconfigured") return json({ error: "NOWPayments is not configured, so currencies cannot be verified." }, 503);
    if (!live.set) return json({ error: "The payment provider did not answer, so this currency could not be verified. Try again." }, 502);
    if (!live.set.has(String(before.provider_currency).toLowerCase())) {
      return json({ error: `The provider does not currently list ${before.provider_currency}. It cannot be enabled.` }, 409);
    }
  }

  const { data: after, error } = await db.from("payment_methods").update({ enabled }).eq("id", id).select("*").maybeSingle();
  if (error || !after) return json({ error: "Could not save the change." }, 502);
  const failed = await auditOrFail(auth.actor, enabled ? "payment_method.enable" : "payment_method.disable", `payment_methods:${id}`, before, after);
  if (failed) return failed;
  return json({ ok: true, row: after });
}
