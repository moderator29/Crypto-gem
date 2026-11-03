import type { Metadata } from "next";
import { NotificationsView } from "@/components/account/NotificationsView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Notifications", description: "Price alerts, payments and listing decisions." };

export default function NotificationsPage() {
  return (
    <div>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Notifications" }]} eyebrow="Account" title="Notifications" description="Price alerts that fired, payment confirmations and listing decisions." />
      <NotificationsView />
    </div>
  );
}
