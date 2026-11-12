"use client";

import { useSyncExternalStore } from "react";
import { MAX_COMPARE } from "@/lib/market-data/analytics";
import { assetKey } from "@/lib/market-data/identifiers";

export interface TrayItem { networkId: string; address: string; symbol: string }

const KEY = "cg:compare-tray";
const EMPTY: TrayItem[] = [];
const subs = new Set<() => void>();
let cache: TrayItem[] | null = null;

const valid = (v: unknown): v is TrayItem => {
  const o = v as Partial<TrayItem> | null;
  return !!o && typeof o.networkId === "string" && typeof o.address === "string" && typeof o.symbol === "string";
};

function read(): TrayItem[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter(valid).slice(0, MAX_COMPARE) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: TrayItem[]): void {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: the tray still works for this visit */
  }
  subs.forEach((f) => f());
}

export const inTray = (items: TrayItem[], networkId: string, address: string): boolean => items.some((i) => assetKey(i.networkId, i.address) === assetKey(networkId, address));

/** Adds or removes a token. Returns false when the tray is full and nothing was added. */
export function toggleTray(item: TrayItem): boolean {
  const items = read();
  if (inTray(items, item.networkId, item.address)) {
    write(items.filter((i) => assetKey(i.networkId, i.address) !== assetKey(item.networkId, item.address)));
    return true;
  }
  if (items.length >= MAX_COMPARE) return false;
  write([...items, item]);
  return true;
}

export const clearTray = (): void => write([]);

/** Tokens queued for comparison, remembered in this browser. */
export function useCompareTray(): TrayItem[] {
  return useSyncExternalStore((f) => (subs.add(f), () => void subs.delete(f)), read, () => EMPTY);
}
