import { z } from "zod";
import { fail, limit, ok, originOf, readJson } from "@/lib/checkout/http";
import { checkoutSecret, NOT_CONFIGURED } from "@/lib/checkout/token";
import { verifyCheckout } from "@/lib/checkout/verify";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ token: z.string().min(10).max(8000), txHash: z.string().min(1).max(140) });

/** Checks a transaction hash against a signed quote. Safe to poll: the same hash and quote always give the same answer. */
export async function POST(req: Request) {
  const limited = limit(req, "verify", 40);
  if (limited) return limited;
  const secret = checkoutSecret();
  if (!secret) return fail(NOT_CONFIGURED, 503);
  const body = bodySchema.safeParse(await readJson(req));
  if (!body.success) return fail("Invalid request", 400);
  try {
    const res = await verifyCheckout(body.data.token, body.data.txHash, secret, { origin: originOf(req) });
    return "error" in res ? fail(res.error, res.httpStatus) : ok(res);
  } catch {
    return fail("Could not check this payment right now. Try again.", 500);
  }
}
