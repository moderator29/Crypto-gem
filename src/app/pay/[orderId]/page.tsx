import type { Metadata } from "next";
import { PaymentPanel } from "@/components/pay/PaymentPanel";

export const metadata: Metadata = { title: "Secure payment", robots: { index: false } };

export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return (
    <div className="pay-page mx-auto w-full max-w-5xl">
      <PaymentPanel orderId={orderId} />
    </div>
  );
}
