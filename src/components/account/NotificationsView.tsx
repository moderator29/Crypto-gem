"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { NavIcon } from "@/components/ui/NavIcon";
import { dayGroup, type DayGroup } from "@/components/dashboard/logic";
import { useAlertChecker } from "@/lib/local/alerts";
import { clearLocalNotifications, markAllLocalNotificationsRead, markLocalNotificationRead, useLocalNotifications, type LocalNotification } from "@/lib/local/notifications";
import { ageShort } from "@/lib/utils/format";

const TABS = [
  { id: "all", label: "All" },
  { id: "alert", label: "Price alerts" },
  { id: "payment", label: "Payments" },
] as const;

const icon = (k: LocalNotification["kind"]) => (k === "alert" ? "alert" : k === "payment" ? "dashboard" : "inbox");

/** Events saved on this device: price alerts that fired and payments completed at checkout. */
export function NotificationsView() {
  useAlertChecker();
  const all = useLocalNotifications();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const unread = all.filter((n) => !n.read).length;
  const items = all.filter((i) => tab === "all" || i.kind === tab);

  return (
    <div className="space-y-4">
      <Link href="/alerts" className="card hover-lift nav-tile flex items-center gap-3.5 p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--brand)_14%,transparent)]"><NavIcon name="alert" size={22} /></span>
        <span className="min-w-0 flex-1"><span className="block font-semibold">Price alerts</span><span className="block text-sm text-soft">Set a price and get told the moment it crosses, while the site is open.</span></span>
        <span className="shrink-0 text-sm font-semibold text-brand">Set one</span>
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="scroll-x min-w-0" role="tablist" aria-label="Notification types">
          {TABS.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="chip" onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && <button type="button" className="btn btn-sm" onClick={markAllLocalNotificationsRead}>Mark all read ({unread})</button>}
          {all.length > 0 && <button type="button" className="btn btn-sm btn-ghost" onClick={clearLocalNotifications}><Trash2 size={14} aria-hidden="true" /> Clear</button>}
        </div>
      </div>
      <p className="text-xs text-muted">Saved on this device only. Clearing your browser data removes them.</p>
      {items.length === 0 ? (
        <EmptyState title="Nothing here yet" description="When a price alert fires or a payment completes in this browser, you will see it here." action={<Link href="/alerts" className="btn btn-sm">Set a price alert</Link>} />
      ) : (
        <div className="space-y-4">
          {(["Today", "Yesterday", "Earlier"] as DayGroup[]).map((g) => {
            const rows = items.map((i, n) => ({ i, n, iso: new Date(i.at).toISOString() })).filter((r) => dayGroup(r.iso) === g);
            if (rows.length === 0) return null;
            return (
              <section key={g} aria-label={g}>
                <h2 className="day-head">{g} <span className="num font-medium">({rows.length})</span></h2>
                <ul className="card divide-y divide-[var(--line-1)] overflow-hidden">
                  {rows.map(({ i, n, iso }) => {
                    const inner = (
                      <>
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-3)] text-soft"><NavIcon name={icon(i.kind)} size={21} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2"><span className={`truncate ${i.read ? "font-medium" : "font-semibold"}`}>{i.title}</span>{!i.read && <span className="unread-dot" role="img" aria-label="Unread" />}</span>
                          {i.body && <span className="block text-sm text-soft">{i.body}</span>}
                        </span>
                        <span className="num shrink-0 text-xs text-muted">{ageShort(iso)} ago</span>
                      </>
                    );
                    const cls = "row-in flex w-full min-w-0 items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[var(--surface-2)]";
                    return (
                      <li key={i.id} style={{ ["--i" as string]: n }}>
                        {i.href ? <Link href={i.href} className={cls} onClick={() => markLocalNotificationRead(i.id)}>{inner}</Link> : <button type="button" className={cls} onClick={() => markLocalNotificationRead(i.id)}>{inner}</button>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
