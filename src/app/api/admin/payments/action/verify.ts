import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshPayment, type PaymentRow } from "@/lib/payments/direct/service";

/**
 * Forces an immediate on-chain re-check of one direct payment. The payments service settles it exactly once
 * when the proofs add up, so calling this repeatedly is safe. Returns the buyer-facing view of the result.
 */
export async function verifyDirectPayment(db: SupabaseClient, paymentId: string) {
  const { data } = await db.from("payments").select("*").eq("id", paymentId).eq("provider", "direct").maybeSingle();
  if (!data) throw new Error("payment not found");
  return refreshPayment(db, data as PaymentRow, { force: true });
}
