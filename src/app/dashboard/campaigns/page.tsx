import type { Metadata } from "next";
import { Gate, CampaignsView } from "@/components/dashboard/views";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Campaigns" };

export default function Page() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Dashboard", href: "/dashboard" }, { label: "Campaigns" }]} eyebrow="Dashboard" title="Advertising campaigns" description="Placements you booked, with measured impressions and clicks." />
      <Gate>
        <CampaignsView />
      </Gate>
    </>
  );
}
