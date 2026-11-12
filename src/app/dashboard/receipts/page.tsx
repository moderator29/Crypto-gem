import type { Metadata } from "next";
import { ReceiptsView } from "@/components/dashboard/views";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Receipts" };

export default function Page() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Dashboard", href: "/dashboard" }, { label: "Receipts" }]} eyebrow="Dashboard" title="Your receipts" description="Payments completed in this browser for listings, boosts and banners." />
      <ReceiptsView />
    </>
  );
}
