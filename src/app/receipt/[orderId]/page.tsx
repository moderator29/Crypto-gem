import type { Metadata } from "next";
import { ReceiptView } from "@/components/pay/ReceiptView";

export const metadata: Metadata = { title: "Receipt", robots: { index: false } };

export default async function ReceiptPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return (
    <div className="mx-auto w-full max-w-2xl">
      <ReceiptView orderId={orderId} />
    </div>
  );
}
