"use client";

import { useSyncExternalStore } from "react";

export interface RecentToken { network: string; address: string; symbol: string; name: string; logo: string | null; at: number }
const KEY = "cg:recent-tokens";
const MAX = 12;
const subs = new Set<() => void>();
let cache: RecentToken[] | null = null;
const EMPTY: RecentToken[] = [];

function read(): RecentToken[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as RecentToken[]).filter((t) => t && typeof t.address === "string").slice(0, MAX) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

/** Remembers a token the person looked at, newest first, in this browser only. */
export function rememberToken(t: Omit<RecentToken, "at">): void {
  const next = [{ ...t, at: Date.now() }, ...read().filter((x) => !(x.network === t.network && x.address === t.address))].slice(0, MAX);
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: kept for this visit only */
  }
  subs.forEach((f) => f());
}

export function clearRecentTokens(): void {
  cache = EMPTY;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing stored */
  }
  subs.forEach((f) => f());
}

export function useRecentTokens(): RecentToken[] {
  return useSyncExternalStore((f) => (subs.add(f), () => void subs.delete(f)), read, () => EMPTY);
}
