"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { NavIcon, type NavIconName } from "@/components/ui/NavIcon";
import { useAccountFetch } from "@/lib/useAccountFetch";

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="card-flat hover-lift flex-1 px-4 py-3 text-center">
      <span className="num block text-2xl font-bold">{value}</span>
      <span className="text-xs text-muted">{label}</span>
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
  const { configured, ready, authenticated, label, userId, login } = useAuth();
  const watch = useAccountFetch<{ items: unknown[] }>("/api/watchlist");
  const alerts = useAccountFetch<{ alerts: Array<{ triggered_at: string | null }> }>("/api/alerts");
  const notes = useAccountFetch<{ unread: number }>("/api/notifications");

  if (!configured) return <EmptyState title="Sign-in is not configured here" description="Your profile appears once sign-in is connected for this site." />;
  if (!ready) return <div className="skeleton h-64" aria-busy="true" />;
  if (!authenticated) return <EmptyState title="Sign in to see your profile" description="Use an email code, a wallet or Google." action={<button type="button" className="btn btn-primary" onClick={login}>Sign in</button>} />;

  const name = label ?? "Account";
  const num = (v: number | undefined) => (v === undefined ? "–" : String(v));
  return (
    <div className="space-y-5">
      <div className="card overflow-hidden">
        <div className="profile-banner h-28 md:h-36" aria-hidden="true" />
        <div className="px-4 pb-5 md:px-6">
          <div className="-mt-10 flex items-end justify-between gap-3">
            <span className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-[var(--surface-1)] bg-gradient-to-br from-[#ff6a4a] to-[#c93a1f] text-3xl font-bold text-white shadow-[var(--shadow-md)]" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
            <Link href="/settings" className="btn btn-sm"><NavIcon name="settings" size={16} /> Manage account</Link>
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight">{name}</h2>
          {userId && <p className="mt-1 flex items-center gap-2 text-xs text-muted"><span className="num truncate">{userId}</span><CopyButton value={userId} label="Copy" what="User ID copied" /></p>}
          <div className="mt-5 flex gap-3">
            <Stat label="Watching" value={num(watch.state === "ok" ? watch.data.items.length : undefined)} href="/dashboard/watchlist" />
            <Stat label="Open alerts" value={num(alerts.state === "ok" ? alerts.data.alerts.filter((a) => !a.triggered_at).length : undefined)} href="/alerts" />
            <Stat label="Unread" value={num(notes.state === "ok" ? notes.data.unread : undefined)} href="/notifications" />
          </div>
        </div>
      </div>

      <section aria-label="Quick actions" className="space-y-2">
        <h2 className="eyebrow px-1">Do more</h2>
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
