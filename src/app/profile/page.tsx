import type { Metadata } from "next";
import { ProfileView } from "@/components/account/ProfileView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Profile" }]} eyebrow="Account" title="Your profile" description="Your account, what you follow, and the next useful actions." />
      <ProfileView />
    </div>
  );
}
