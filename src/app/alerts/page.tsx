import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertsView } from "@/components/account/AlertsView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Price alerts", description: "Get notified when a token crosses a price you choose." };

export default function AlertsPage() {
  return (
    <div>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Price alerts" }]} eyebrow="On this device" title="Price alerts" description="Choose a token and a price. While the site is open in a tab, you are told the moment it crosses." />
      <Suspense fallback={<div className="skeleton h-64" />}><AlertsView /></Suspense>
    </div>
  );
}
