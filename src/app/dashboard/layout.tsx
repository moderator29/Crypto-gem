import type { Metadata } from "next";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { DashboardProvider } from "@/components/dashboard/DashboardProvider";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s | Dashboard" }, robots: { index: false } };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <aside><DashboardNav /></aside>
        <div className="min-w-0">{children}</div>
      </div>
    </DashboardProvider>
  );
}
