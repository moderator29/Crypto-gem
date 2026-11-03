"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { NavIcon } from "@/components/ui/NavIcon";
import { useToast } from "@/components/ui/Toast";
import { accountCall, useAccountFetch } from "@/lib/useAccountFetch";
import { ageShort } from "@/lib/utils/format";

interface Item { id: string; kind: string; title: string; body: string | null; href: string | null; read_at: string | null; created_at: string }
const TABS = [
  { id: "all", label: "All" },
  { id: "alert", label: "Price alerts" },
  { id: "payment", label: "Payments" },
  { id: "listing", label: "Listings" },
] as const;

/** In-app notifications: price alerts that fired, payment confirmations and listing decisions. */
export function NotificationsView() {
  const res = useAccountFetch<{ items: Item[]; unread: number }>("/api/notifications");
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");

  if (res.state === "loading") return <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-20" />)}</div>;
  if (res.state === "signin") return <EmptyState icon={undefined} title="Sign in to see notifications" description="Price alerts, payment confirmations and listing decisions appear here." action={<Link href="/login?next=/notifications" className="btn btn-primary">Sign in</Link>} />;
  if (res.state === "error") return <EmptyState tone="error" title="Notifications are unavailable" description={res.message} action={<button type="button" className="btn btn-sm" onClick={res.reload}>Retry</button>} />;

  const items = res.data.items.filter((i) => tab === "all" || i.kind === tab);
  async function markAll() {
    try {
      await accountCall("/api/notifications", "POST", {});
      res.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  }
  async function open(i: Item) {
    if (!i.read_at) await accountCall("/api/notifications", "POST", { id: i.id }).catch(() => undefined);
  }
  return (
    <div className="space-y-4">
      <Link href="/alerts" className="card hover-lift nav-tile flex items-center gap-3.5 p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--brand)_14%,transparent)]"><NavIcon name="alert" size={22} /></span>
        <span className="min-w-0 flex-1"><span className="block font-semibold">Price alerts are here</span><span className="block text-sm text-soft">Set a price and get notified the moment it crosses.</span></span>
        <span className="text-sm font-semibold text-brand">Set one</span>
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="scroll-x" role="tablist" aria-label="Notification types">
          {TABS.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="chip" onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>
        {res.data.unread > 0 && <button type="button" className="btn btn-sm" onClick={() => void markAll()}>Mark all read ({res.data.unread})</button>}
      </div>
      {items.length === 0 ? (
        <EmptyState title="Nothing here yet" description="When a price alert fires or a payment or listing changes, you will see it here." action={<Link href="/alerts" className="btn btn-sm">Set a price alert</Link>} />
      ) : (
        <ul className="card divide-y divide-[var(--line-1)] overflow-hidden">
          {items.map((i, n) => {
            const inner = (
              <>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-3)] text-soft"><NavIcon name={i.kind === "alert" ? "alert" : i.kind === "payment" ? "dashboard" : "inbox"} size={21} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2"><span className="truncate font-semibold">{i.title}</span>{!i.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" aria-label="Unread" />}</span>
                  {i.body && <span className="block text-sm text-soft">{i.body}</span>}
                </span>
                <span className="num shrink-0 text-xs text-muted">{ageShort(i.created_at)} ago</span>
              </>
            );
            const cls = "row-in flex items-center gap-3 px-4 py-3.5 transition hover:bg-[var(--surface-2)]";
            return (
              <li key={i.id} style={{ ["--i" as string]: n }}>
                {i.href ? <Link href={i.href} className={cls} onClick={() => void open(i)}>{inner}</Link> : <div className={cls}>{inner}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
