import type { Metadata } from "next";
import { WatchlistView } from "@/components/dashboard/views";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Watchlist" };

export default function Page() {
  return (
    <>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Dashboard", href: "/dashboard" }, { label: "Watchlist" }]} eyebrow="Dashboard" title="Watchlist" description="Tokens you follow on this device, with live prices." />
      <WatchlistView />
    </>
  );
}
