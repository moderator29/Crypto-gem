import { Gate, OverviewView } from "@/components/dashboard/views";
import { PageHeader } from "@/components/ui/PageHeader";

export default function Page() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Dashboard" }]} eyebrow="Dashboard" title="Overview" description="Your projects, spending and what needs your attention." />
      <Gate>
        <OverviewView />
      </Gate>
    </>
  );
}
