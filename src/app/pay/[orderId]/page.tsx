import type { Metadata } from "next";
import { PaymentPanel } from "@/components/pay/PaymentPanel";

export const metadata: Metadata = { title: "Payment", robots: { index: false } };

export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PaymentPanel orderId={orderId} />
    </div>
  );
}
