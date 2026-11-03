export const dynamic = "force-dynamic";

/**
 * Listing submission. Persistence needs Supabase and payment needs NOWPayments,
 * so until both are configured this answers honestly instead of pretending the
 * order exists.
 */
export async function POST() {
  const missing = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "NOWPAYMENTS_API_KEY", "NOWPAYMENTS_IPN_SECRET"].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return Response.json({ error: `Checkout is not live yet. Missing server configuration: ${missing.join(", ")}. See SETUP.md.` }, { status: 503 });
  }
  return Response.json({ error: "Order creation is not implemented in this build." }, { status: 501 });
}
