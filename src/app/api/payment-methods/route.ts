import { DIRECT_METHODS } from "@/lib/payments/direct/methods";

export const dynamic = "force-dynamic";

/** Direct payment options in the shape the checkout screens already read. */
export async function GET() {
  return Response.json({
    configured: true,
    methods: DIRECT_METHODS.map((m) => ({ id: m.id, label: `${m.asset} (${m.networkLabel})`, provider_currency: m.id, network: m.networkLabel })),
  });
}
