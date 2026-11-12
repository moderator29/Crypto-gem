import { OverviewView } from "@/components/dashboard/views";
import { PageHeader } from "@/components/ui/PageHeader";

export default function Page() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Dashboard" }]} eyebrow="Dashboard" title="Overview" description="Your watchlist, alerts and receipts, saved on this device." />
      <OverviewView />
    </>
  );
}
