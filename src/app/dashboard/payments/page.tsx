import type { Metadata } from "next";
import { Gate, PaymentsView } from "@/components/dashboard/views";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Payments" };

export default function Page() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Dashboard", href: "/dashboard" }, { label: "Payments" }]} eyebrow="Dashboard" title="Payments" description="Orders and their payment status." />
      <Gate>
        <PaymentsView />
      </Gate>
    </>
  );
}
