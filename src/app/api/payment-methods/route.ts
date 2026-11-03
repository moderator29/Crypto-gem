import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { isConfigured, nowpayments } from "@/lib/payments/nowpayments";

export const dynamic = "force-dynamic";

/** Payment options that an administrator enabled AND the provider currently reports as available. */
export async function GET() {
  if (!supabaseConfigured() || !isConfigured()) return Response.json({ methods: [], configured: false });
  try {
    const [{ data }, live] = await Promise.all([supabaseAdmin().from("payment_methods").select("id,label,provider_currency,network").eq("enabled", true).order("sort"), nowpayments.currencies()]);
    const set = new Set(live.map((c) => c.toLowerCase()));
    return Response.json({ configured: true, methods: (data ?? []).filter((m) => set.has(m.provider_currency.toLowerCase())) });
  } catch {
    return Response.json({ configured: true, methods: [], error: "Payment options are temporarily unavailable." }, { status: 502 });
  }
}
