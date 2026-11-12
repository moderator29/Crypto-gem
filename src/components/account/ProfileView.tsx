"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { CountUp } from "@/components/fx/CountUp";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { NavIcon, type NavIconName } from "@/components/ui/NavIcon";
import { useAccountFetch } from "@/lib/useAccountFetch";
import { ageShort } from "@/lib/utils/format";

function Stat({ label, value, href }: { label: string; value: number | undefined; href: string }) {
  return (
    <Link href={href} className="card hover-lift flex flex-col gap-1 p-4">
      <span className="eyebrow !text-muted">{label}</span>
      <span className="num text-3xl font-bold">{value === undefined ? "–" : <CountUp value={value} />}</span>
    </Link>
  );
}

const ACTIONS: Array<{ href: string; icon: NavIconName; label: string; hint: string }> = [
  { href: "/add-coin", icon: "add", label: "List a coin", hint: "Paste a contract and we detect the rest" },
  { href: "/boost", icon: "boost", label: "Boost a project", hint: "Sponsored visibility, clearly labelled" },
  { href: "/alerts", icon: "alert", label: "Set a price alert", hint: "Get notified when a price crosses" },
  { href: "/compare", icon: "compare", label: "Compare tokens", hint: "Overlay up to three on 7 days" },
];

/** Account home: identity, real counts from the user's own data, and the next useful actions. */
export function ProfileView() {
  const { authenticated, label, userId: privyId } = useAuth();
  const userId = authenticated ? privyId : null;
  const watch = useAccountFetch<{ items: unknown[] }>("/api/watchlist");
  const alerts = useAccountFetch<{ alerts: Array<{ triggered_at: string | null }> }>("/api/alerts");
  const notes = useAccountFetch<{ unread: number; items: Array<{ id: string; title: string; href: string | null; read_at: string | null; created_at: string }> }>("/api/notifications");

  const name = authenticated && label ? label : "Your device";
  const recent = notes.state === "ok" ? notes.data.items.slice(0, 4) : [];
  return (
    <div className="stagger grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
      <div className="card overflow-hidden sm:col-span-3">
        <div className="profile-banner bento-hero h-28 md:h-36" aria-hidden="true" />
        <div className="px-4 pb-5 md:px-6">
          <div className="-mt-10 flex items-end justify-between gap-3">
            <span className="fx-ring grid h-20 w-20 place-items-center rounded-full p-[3px]" style={{ background: "conic-gradient(var(--brand), var(--warm), var(--up), var(--brand))" }}>
              <span className="grid h-full w-full place-items-center rounded-full border-4 border-[var(--surface-1)] bg-[var(--surface-2)] text-3xl font-bold" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
            </span>
            <Link href="/settings" className="btn btn-sm"><NavIcon name="settings" size={16} /> Manage account</Link>
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">{name}</h2>
          {userId && <p className="mt-1 flex items-center gap-2 text-xs text-muted"><span className="num truncate">{userId}</span><CopyButton value={userId} label="Copy" what="User ID copied" /></p>}
        </div>
      </div>
      <Stat label="Watching" value={watch.state === "ok" ? watch.data.items.length : undefined} href="/dashboard/watchlist" />
      <Stat label="Open alerts" value={alerts.state === "ok" ? alerts.data.alerts.filter((a) => !a.triggered_at).length : undefined} href="/alerts" />
      <Stat label="Unread" value={notes.state === "ok" ? notes.data.unread : undefined} href="/notifications" />

      <section aria-label="Recent notifications" className="card p-5 sm:col-span-3 lg:col-span-1">
        <h2 className="h3 mb-3">Recent activity</h2>
        {notes.state === "loading" ? <div className="skeleton h-24" /> : recent.length === 0 ? <p className="text-sm text-muted">Nothing yet. Alerts, payments and listing decisions show up here.</p> : (
          <ul className="space-y-3">
            {recent.map((i) => (
              <li key={i.id}><Link href={i.href ?? "/notifications"} className="flex items-center gap-2 text-sm hover:text-brand">{!i.read_at && <span className="unread-dot" role="img" aria-label="Unread" />}<span className="min-w-0 flex-1 truncate">{i.title}</span><span className="num shrink-0 text-xs text-muted">{ageShort(i.created_at)}</span></Link></li>
            ))}
          </ul>
        )}
      </section>
      <section aria-label="Quick actions" className="sm:col-span-3 lg:col-span-2">
        <h2 className="eyebrow mb-2 px-1">Do more</h2>
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
          {ACTIONS.map((a) => (
            <li key={a.href}>
              <Link href={a.href} className="card hover-lift nav-tile flex items-center gap-3.5 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--surface-3)]"><NavIcon name={a.icon} size={22} /></span>
                <span><span className="block font-semibold">{a.label}</span><span className="block text-sm text-muted">{a.hint}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
