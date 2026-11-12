import { fail, limit, ok } from "@/lib/checkout/http";
import { checkoutSecret, NOT_CONFIGURED } from "@/lib/checkout/token";
import { readReceipt } from "@/lib/checkout/verify";

export const dynamic = "force-dynamic";

/** Returns the data of a signed receipt token. Anything unsigned or altered is a 400. */
export function GET(req: Request) {
  const limited = limit(req, "receipt", 60);
  if (limited) return limited;
  const secret = checkoutSecret();
  if (!secret) return fail(NOT_CONFIGURED, 503);
  const r = new URL(req.url).searchParams.get("r") ?? "";
  const receipt = readReceipt(r, secret);
  return receipt ? ok({ receipt }) : fail("This receipt is invalid or was changed.", 400);
}
