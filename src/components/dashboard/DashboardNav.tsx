"use client";

import { Bell, Eye, LayoutDashboard, Receipt, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LinkTabs } from "@/components/ui/LinkTabs";

const ITEMS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/watchlist", label: "Watchlist", icon: Eye },
  { href: "/dashboard/receipts", label: "Receipts", icon: Receipt },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

/** Sidebar on desktop, link tabs on phones. Every item is a real page and reads only this device's data. */
export function DashboardNav() {
  const path = usePathname();
  const active = ITEMS.find((i) => (i.href === "/dashboard" ? path === "/dashboard" : path.startsWith(i.href)))?.href ?? "/dashboard";
  return (
    <>
      <div className="lg:hidden"><LinkTabs tabs={ITEMS.map(({ href, label }) => ({ href, label }))} activeHref={active} label="Dashboard sections" /></div>
      <nav aria-label="Dashboard sections" className="card sticky top-[calc(var(--header-h)+16px)] hidden space-y-1 p-2 lg:block">
        {ITEMS.map((i) => {
          const on = i.href === active;
          return (
            <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors ${on ? "bg-[var(--surface-3)] text-text shadow-[inset_0_0_0_1px_var(--line-2)]" : "text-soft hover:bg-[var(--surface-2)] hover:text-text"}`}>
              <i.icon size={17} aria-hidden="true" className={on ? "text-brand" : ""} /> {i.label}
            </Link>
          );
        })}
        <p className="px-3 pb-2 pt-3 text-[11px] text-muted">Saved on this device. No account needed.</p>
      </nav>
    </>
  );
}
