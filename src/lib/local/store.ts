"use client";

import { useSyncExternalStore } from "react";

/** A list kept in this browser's localStorage, shared by every component and kept in sync across tabs. */
export interface LocalList<T> {
  read: () => T[];
  write: (next: T[]) => void;
  update: (fn: (current: T[]) => T[]) => T[];
  use: () => T[];
  /** False once a save failed (private mode, full storage): the list then lives for this visit only. */
  persisted: () => boolean;
  /** Drops the in-memory copy so the next read comes from storage. Used before a decision another tab may have changed. */
  refresh: () => void;
}

/**
 * Creates one localStorage backed list. Storage can be missing (server render), blocked
 * (private mode) or full, so every access is guarded and the list keeps working in memory
 * for the current visit when it cannot be saved.
 */
export function createLocalList<T>(key: string, isValid: (x: unknown) => x is T, max: number): LocalList<T> {
  const EMPTY: T[] = [];
  const subs = new Set<() => void>();
  let cache: T[] | null = null;
  let listening = false;
  let saved = true;

  const emit = () => subs.forEach((f) => f());

  function read(): T[] {
    if (cache) return cache;
    if (typeof window === "undefined") return EMPTY;
    try {
      const raw = window.localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      cache = Array.isArray(parsed) ? parsed.filter(isValid).slice(0, max) : EMPTY;
    } catch {
      cache = EMPTY;
    }
    return cache;
  }

  function write(next: T[]): void {
    cache = next.slice(0, max);
    try {
      window.localStorage.setItem(key, JSON.stringify(cache));
      saved = true;
    } catch {
      saved = false;
    }
    emit();
  }

  function update(fn: (current: T[]) => T[]): T[] {
    const next = fn(read());
    write(next);
    return cache ?? next;
  }

  function onStorage(e: StorageEvent) {
    if (e.key !== key && e.key !== null) return;
    cache = null;
    emit();
  }

  function subscribe(f: () => void) {
    subs.add(f);
    if (!listening && typeof window !== "undefined") {
      window.addEventListener("storage", onStorage);
      listening = true;
    }
    return () => {
      subs.delete(f);
      if (subs.size === 0 && listening) {
        window.removeEventListener("storage", onStorage);
        listening = false;
      }
    };
  }

  return {
    read,
    write,
    update,
    use: () => useSyncExternalStore(subscribe, read, () => EMPTY),
    persisted: () => saved,
    refresh: () => {
      cache = null;
    },
  };
}

export const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
export const str = (x: unknown): x is string => typeof x === "string";
export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
