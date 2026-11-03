import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertsView } from "@/components/account/AlertsView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Price alerts", description: "Get notified when a token crosses a price you choose." };

export default function AlertsPage() {
  return (
    <div>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Price alerts" }]} eyebrow="Account" title="Price alerts" description="Choose a token and a price. When it crosses, the alert lands in your notifications." />
      <Suspense fallback={<div className="skeleton h-64" />}><AlertsView /></Suspense>
    </div>
  );
}
