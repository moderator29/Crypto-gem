import { z } from "zod";
import { fail, limit, ok, readJson } from "@/lib/checkout/http";
import { parseItem } from "@/lib/checkout/items";
import { CheckoutError, createQuote } from "@/lib/checkout/quote";
import { checkoutSecret, NOT_CONFIGURED } from "@/lib/checkout/token";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ methodId: z.string().min(1).max(40), item: z.record(z.string(), z.unknown()) });

/** Signs a quote for one item and one payment method. Price and amount are decided here, never by the client. */
export async function POST(req: Request) {
  const limited = limit(req, "quote", 20);
  if (limited) return limited;
  const secret = checkoutSecret();
  if (!secret) return fail(NOT_CONFIGURED, 503);
  const body = bodySchema.safeParse(await readJson(req));
  if (!body.success) return fail("Invalid request", 400);
  const item = parseItem(body.data.item);
  if (!item.ok) return fail(item.error, 400);
  try {
    return ok(await createQuote(body.data.methodId, item.item, secret));
  } catch (e) {
    if (e instanceof CheckoutError) return fail(e.message, e.status);
    return fail("Could not prepare this payment. Try again.", 500);
  }
}
