"use client";

import { MonitorSmartphone } from "lucide-react";
import Link from "next/link";
import { CountUp } from "@/components/fx/CountUp";
import { NavIcon, type NavIconName } from "@/components/ui/NavIcon";
import { useLocalAlerts } from "@/lib/local/alerts";
import { useLocalNotifications } from "@/lib/local/notifications";
import { useLocalReceipts } from "@/lib/local/receipts";
import { useLocalWatchlist } from "@/lib/local/watchlist";
import { ageShort } from "@/lib/utils/format";

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="card hover-lift flex min-w-0 flex-col gap-1 p-4">
      <span className="eyebrow !text-muted">{label}</span>
      <span className="num text-3xl font-bold"><CountUp value={value} /></span>
    </Link>
  );
}

const ACTIONS: Array<{ href: string; icon: NavIconName; label: string; hint: string }> = [
  { href: "/add-coin", icon: "add", label: "List a coin", hint: "Paste a contract and we detect the rest" },
  { href: "/boost", icon: "boost", label: "Boost a token", hint: "Sponsored visibility, clearly labelled" },
  { href: "/alerts", icon: "alert", label: "Set a price alert", hint: "Get told when a price crosses" },
  { href: "/compare", icon: "compare", label: "Compare tokens", hint: "Overlay up to three on 7 days" },
];

/** "Your device": real counts from what this browser has saved, recent events, and the next useful actions. */
export function ProfileView() {
  const watch = useLocalWatchlist();
  const alerts = useLocalAlerts();
  const notes = useLocalNotifications();
  const receipts = useLocalReceipts();
  const recent = notes.slice(0, 4);

  return (
    <div className="stagger grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="card overflow-hidden sm:col-span-2 lg:col-span-4">
        <div className="profile-banner bento-hero h-24 md:h-32" aria-hidden="true" />
        <div className="px-4 pb-5 md:px-6">
          <div className="-mt-9 flex items-end justify-between gap-3">
            <span className="fx-ring grid h-[72px] w-[72px] place-items-center rounded-full p-[3px]" style={{ background: "conic-gradient(var(--brand), var(--warm), var(--up), var(--brand))" }}>
              <span className="grid h-full w-full place-items-center rounded-full border-4 border-[var(--surface-1)] bg-[var(--surface-2)] text-brand"><MonitorSmartphone size={28} aria-hidden="true" /></span>
            </span>
            <Link href="/settings" className="btn btn-sm"><NavIcon name="settings" size={16} /> Settings</Link>
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">This device</h2>
          <p className="mt-1 max-w-2xl text-sm text-soft">There are no accounts on CryptoGemCN. Your watchlist, alerts, notifications and receipts are saved in this browser only. They do not sync to other devices and are removed if you clear your browser data.</p>
        </div>
      </div>
      <Stat label="Watching" value={watch.length} href="/dashboard/watchlist" />
      <Stat label="Open alerts" value={alerts.filter((a) => a.firedAt === null).length} href="/alerts" />
      <Stat label="Unread" value={notes.filter((n) => !n.read).length} href="/notifications" />
      <Stat label="Receipts" value={receipts.length} href="/dashboard/receipts" />

      <section aria-label="Recent notifications" className="card min-w-0 p-5 sm:col-span-2 lg:col-span-2">
        <h2 className="h3 mb-3">Recent activity</h2>
        {recent.length === 0 ? <p className="text-sm text-muted">Nothing yet. Fired alerts and completed payments show up here.</p> : (
          <ul className="space-y-3">
            {recent.map((i) => (
              <li key={i.id}><Link href={i.href ?? "/notifications"} className="flex min-w-0 items-center gap-2 text-sm hover:text-brand">{!i.read && <span className="unread-dot" role="img" aria-label="Unread" />}<span className="min-w-0 flex-1 truncate">{i.title}</span><span className="num shrink-0 text-xs text-muted">{ageShort(new Date(i.at).toISOString())}</span></Link></li>
            ))}
          </ul>
        )}
      </section>
      <section aria-label="Quick actions" className="min-w-0 sm:col-span-2 lg:col-span-2">
        <h2 className="eyebrow mb-2 px-1">Do more</h2>
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
          {ACTIONS.map((a) => (
            <li key={a.href}>
              <Link href={a.href} className="card hover-lift nav-tile flex min-w-0 items-center gap-3.5 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--surface-3)]"><NavIcon name={a.icon} size={22} /></span>
                <span className="min-w-0"><span className="block font-semibold">{a.label}</span><span className="block text-sm text-muted">{a.hint}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
