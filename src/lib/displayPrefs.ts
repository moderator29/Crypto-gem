"use client";

import { useSyncExternalStore } from "react";

export interface DisplayPrefs { charts: boolean; compact: boolean }
const KEY = "cg:display";
const DEFAULTS: DisplayPrefs = { charts: true, compact: false };
const subs = new Set<() => void>();
let cache: DisplayPrefs | null = null;

function read(): DisplayPrefs {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<DisplayPrefs>) } : DEFAULTS;
  } catch {
    cache = DEFAULTS;
  }
  return cache;
}

export function setDisplayPrefs(patch: Partial<DisplayPrefs>): void {
  cache = { ...read(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* private mode: the choice still applies for this visit */
  }
  subs.forEach((f) => f());
}

/** Board display choices (mini charts, density), remembered in this browser. */
export function useDisplayPrefs(): DisplayPrefs {
  return useSyncExternalStore((f) => (subs.add(f), () => void subs.delete(f)), read, () => DEFAULTS);
}
