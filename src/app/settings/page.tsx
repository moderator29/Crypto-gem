import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/SettingsView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Settings" }]} eyebrow="Account" title="Settings" description="Your profile, how you sign in, and how Crypto Gems looks for you." />
      <SettingsView />
    </div>
  );
}
