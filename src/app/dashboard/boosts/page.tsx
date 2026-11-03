import type { Metadata } from "next";
import { Gate, BoostsView } from "@/components/dashboard/views";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Boosts" };

export default function Page() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Dashboard", href: "/dashboard" }, { label: "Boosts" }]} eyebrow="Dashboard" title="Boosts" description="Sponsored visibility you have purchased." />
      <Gate>
        <BoostsView />
      </Gate>
    </>
  );
}
