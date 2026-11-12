import { FileX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ReceiptActions } from "@/components/checkout/ReceiptActions";
import { ReceiptDocument } from "@/components/checkout/ReceiptDocument";
import { EmptyState } from "@/components/ui/EmptyState";
import { checkoutSecret } from "@/lib/checkout/token";
import { readReceipt } from "@/lib/checkout/verify";

export const metadata: Metadata = { title: "Receipt", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutReceiptPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const raw = Array.isArray(q.r) ? q.r[0] : q.r;
  const secret = checkoutSecret();
  const receipt = secret && raw ? readReceipt(raw, secret) : null;

  if (!receipt) {
    return (
      <div className="co-page mx-auto w-full max-w-3xl">
        <EmptyState
          icon={FileX}
          tone="error"
          title={secret ? "This receipt link is not valid" : "Receipts are not available right now"}
          description={secret ? "The link is incomplete or was changed. Open it again from the checkout, or ask an admin on Telegram with your receipt number." : "Checkout is not configured on this server yet."}
          action={
            <Link className="btn btn-primary" href="/checkout">
              Go to checkout
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="co-page mx-auto w-full max-w-3xl space-y-4">
      <ReceiptActions r={receipt} />
      <ReceiptDocument r={receipt} />
    </div>
  );
}
