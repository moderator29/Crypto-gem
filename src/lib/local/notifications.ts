"use client";

import { createLocalList, isRecord, str, uid } from "./store";

export type LocalNotificationKind = "alert" | "payment" | "listing" | "info";

/** One event kept on this device: a fired price alert, a completed payment, and similar. */
export interface LocalNotification { id: string; kind: LocalNotificationKind; title: string; body: string | null; href: string | null; at: number; read: boolean }

const KINDS: readonly string[] = ["alert", "payment", "listing", "info"];
const isNote = (x: unknown): x is LocalNotification =>
  isRecord(x) && str(x.id) && str(x.kind) && KINDS.includes(x.kind) && str(x.title) && (x.body === null || str(x.body)) && (x.href === null || str(x.href)) && typeof x.at === "number" && typeof x.read === "boolean";

export const notificationsStore = createLocalList<LocalNotification>("cg:notifications", isNote, 100);

/** Adds an event to the top of this device's notifications. Unknown kinds are stored as "info". */
export function pushLocalNotification(n: { kind: LocalNotificationKind | string; title: string; body?: string | null; href?: string | null }): LocalNotification {
  const item: LocalNotification = {
    id: uid(),
    kind: (KINDS.includes(n.kind) ? n.kind : "info") as LocalNotificationKind,
    title: n.title.slice(0, 160),
    body: n.body ? n.body.slice(0, 400) : null,
    href: n.href && n.href.startsWith("/") ? n.href : null,
    at: Date.now(),
    read: false,
  };
  notificationsStore.update((list) => [item, ...list]);
  return item;
}

export function markLocalNotificationRead(id: string): void {
  notificationsStore.update((list) => list.map((n) => (n.id === id && !n.read ? { ...n, read: true } : n)));
}

export function markAllLocalNotificationsRead(): void {
  notificationsStore.update((list) => (list.some((n) => !n.read) ? list.map((n) => ({ ...n, read: true })) : list));
}

export function clearLocalNotifications(): void {
  notificationsStore.write([]);
}

export const useLocalNotifications = notificationsStore.use;

/** Count of unread events on this device. */
export function useUnreadLocalNotifications(): number {
  return useLocalNotifications().filter((n) => !n.read).length;
}
