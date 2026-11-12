"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { playSound } from "@/components/fx/sound";
import { useToast } from "@/components/ui/Toast";
import { priceUsd } from "@/lib/utils/format";
import { pushLocalNotification } from "./notifications";
import { fetchLivePrice, inBatches } from "./prices";
import { createLocalList, isRecord, str, uid } from "./store";

export type AlertDirection = "above" | "below";

/** A price alert saved on this device. It is checked only while the site is open in a tab. */
export interface LocalAlert {
  id: string; network: string; address: string; symbol: string; name: string; logo: string | null;
  direction: AlertDirection; price: number; createdAt: number; firedAt: number | null; firedPrice: number | null;
}

const isAlert = (x: unknown): x is LocalAlert =>
  isRecord(x) && str(x.id) && str(x.network) && str(x.address) && str(x.symbol) && str(x.name) && (x.logo === null || str(x.logo)) &&
  (x.direction === "above" || x.direction === "below") && typeof x.price === "number" && x.price > 0 && typeof x.createdAt === "number" &&
  (x.firedAt === null || typeof x.firedAt === "number") && (x.firedPrice === null || typeof x.firedPrice === "number");

export const alertsStore = createLocalList<LocalAlert>("cg:alerts", isAlert, 100);
export const CHECK_EVERY_MS = 60_000;

/** True when a live price has reached the alert's target in its direction. */
export function crossed(a: Pick<LocalAlert, "direction" | "price">, live: number | null): boolean {
  if (live === null || !Number.isFinite(live)) return false;
  return a.direction === "above" ? live >= a.price : live <= a.price;
}

export function addLocalAlert(a: Omit<LocalAlert, "id" | "createdAt" | "firedAt" | "firedPrice">): LocalAlert {
  const item: LocalAlert = { ...a, id: uid(), createdAt: Date.now(), firedAt: null, firedPrice: null };
  alertsStore.update((list) => [item, ...list]);
  return item;
}

export function removeLocalAlert(id: string): void {
  alertsStore.update((list) => list.filter((a) => a.id !== id));
}

/** Puts a fired alert back to watching. */
export function rearmLocalAlert(id: string): void {
  alertsStore.update((list) => list.map((a) => (a.id === id ? { ...a, firedAt: null, firedPrice: null } : a)));
}

export const useLocalAlerts = alertsStore.use;

type FireListener = (a: LocalAlert) => void;
const fireListeners = new Set<FireListener>();
let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

/**
 * Checks every open alert once: fetches the live price, and for each alert that crossed,
 * marks it fired, saves a notification on this device, plays the notify sound, shows a
 * browser notification when permission was granted, and tells every on-screen listener.
 * Storage is re-read before marking so two open tabs do not fire the same alert twice.
 */
export async function checkLocalAlerts(): Promise<LocalAlert[]> {
  if (running) return [];
  running = true;
  const fired: LocalAlert[] = [];
  try {
    const open = alertsStore.read().filter((a) => a.firedAt === null);
    await inBatches(open, 4, async (a) => {
      const { priceUsd: live } = await fetchLivePrice(a.network, a.address);
      if (!crossed(a, live)) return;
      alertsStore.refresh();
      const current = alertsStore.read().find((x) => x.id === a.id);
      if (!current || current.firedAt !== null) return;
      const done: LocalAlert = { ...current, firedAt: Date.now(), firedPrice: live };
      alertsStore.update((list) => list.map((x) => (x.id === a.id ? done : x)));
      fired.push(done);
    });
  } finally {
    running = false;
  }
  for (const a of fired) announce(a);
  return fired;
}

function announce(a: LocalAlert): void {
  const title = `${a.symbol} is ${a.direction} ${priceUsd(a.price)}`;
  const body = `Now ${priceUsd(a.firedPrice)}. Your alert on ${a.name} has fired.`;
  pushLocalNotification({ kind: "alert", title, body, href: `/token/${a.network}/${a.address}` });
  playSound("notify");
  [...fireListeners].at(-1)?.(a);
  showBrowserNotification(title, body, `cg-alert-${a.id}`);
}

/** Shows a system notification when allowed. Returns false where the browser refuses (some mobile browsers need a service worker). */
function showBrowserNotification(title: string, body: string, tag: string): boolean {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  try {
    new Notification(title, { body, tag });
    return true;
  } catch {
    return false;
  }
}

function start(): void {
  if (timer) return;
  timer = setInterval(() => void checkLocalAlerts(), CHECK_EVERY_MS);
  setTimeout(() => void checkLocalAlerts(), 1500);
}

function stop(): void {
  if (timer && fireListeners.size === 0) {
    clearInterval(timer);
    timer = null;
  }
}

/**
 * Keeps the alert checker running while the calling component is mounted and shows a toast
 * for every alert that fires. Mount it anywhere; several mounts share one checker.
 */
export function useAlertChecker(): void {
  const toast = useToast();
  const ref = useRef(toast);
  useEffect(() => {
    ref.current = toast;
  }, [toast]);
  useEffect(() => {
    const onFire: FireListener = (a) => ref.current.success(`${a.symbol} crossed ${priceUsd(a.price)}`, `Now ${priceUsd(a.firedPrice)}. Saved in your notifications.`);
    fireListeners.add(onFire);
    start();
    return () => {
      fireListeners.delete(onFire);
      stop();
    };
  }, []);
}

/** Mountable form of useAlertChecker for layouts. Renders nothing. */
export function LocalAlertsRunner(): null {
  useAlertChecker();
  return null;
}

type Permission = "granted" | "denied" | "default" | "unsupported";
const permSubs = new Set<() => void>();
const readPermission = (): Permission => (typeof Notification === "undefined" ? "unsupported" : Notification.permission);

/** Browser notification permission, updated after the person answers the prompt. */
export function useNotificationPermission(): Permission {
  return useSyncExternalStore((f) => (permSubs.add(f), () => void permSubs.delete(f)), readPermission, () => "default");
}

/** Asks the browser for notification permission. Only call from a button press. */
export async function requestNotificationPermission(): Promise<Permission> {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    await Notification.requestPermission();
  } finally {
    permSubs.forEach((f) => f());
  }
  return readPermission();
}
