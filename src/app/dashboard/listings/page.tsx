import type { Metadata } from "next";
import { Gate, ListingsView } from "@/components/dashboard/views";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Listings" };

export default function Page() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Dashboard", href: "/dashboard" }, { label: "Listings" }]} eyebrow="Dashboard" title="Listings" description="Every token you have submitted, with its review status." />
      <Gate>
        <ListingsView />
      </Gate>
    </>
  );
}
