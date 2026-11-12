import { limit, ok } from "@/lib/checkout/http";
import { publicMethods } from "@/lib/checkout/quote";

export const dynamic = "force-dynamic";

/** The public list of payment methods. Receiving addresses are only handed out with a signed quote. */
export function GET(req: Request) {
  return limit(req, "methods", 60) ?? ok({ methods: publicMethods() });
}
