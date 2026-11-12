import type { Metadata } from "next";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { itemFromQuery } from "@/lib/checkout/items";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { item, error } = itemFromQuery(await searchParams);
  return (
    <div className="co-page mx-auto w-full max-w-5xl">
      <CheckoutFlow initialItem={item} itemError={error} />
    </div>
  );
}
