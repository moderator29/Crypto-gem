"use client";

import { useSyncExternalStore } from "react";
import { readRaw, subscribe } from "./store";

const cache = new Map<string, { raw: string | null; value: unknown }>();

/** Parse once per distinct stored string so the snapshot stays referentially stable between renders. */
function snapshot<T>(key: string, raw: string | null, parse: (raw: string | null) => T): T {
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  const value = parse(raw);
  cache.set(key, { raw, value });
  return value;
}

/** Subscribe a component to one stored value. Renders the empty value on the server and during hydration, then the saved one. */
export function useStored<T>(key: string, parse: (raw: string | null) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => snapshot(key, readRaw(key), parse),
    () => snapshot(`server:${key}`, null, parse),
  );
}
