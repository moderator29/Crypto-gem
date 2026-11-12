import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/SettingsView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Settings" }]} eyebrow="On this device" title="Settings" description="How CryptoGemCN looks and sounds for you, and the data saved in this browser." />
      <SettingsView />
    </div>
  );
}
