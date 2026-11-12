import type { Metadata } from "next";
import { NotificationsView } from "@/components/account/NotificationsView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Notifications", description: "Price alerts and payments saved on this device." };

export default function NotificationsPage() {
  return (
    <div>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Notifications" }]} eyebrow="On this device" title="Notifications" description="Price alerts that fired and payments completed in this browser." />
      <NotificationsView />
    </div>
  );
}
