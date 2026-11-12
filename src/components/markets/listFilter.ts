"use client";

import { useSyncExternalStore } from "react";

let query = "";
const subs = new Set<() => void>();

export function setListQuery(q: string): void {
  query = q;
  subs.forEach((f) => f());
}

/** The text typed in the list's find box. Shared so the sticky bar and the table stay in step. */
export function useListQuery(): string {
  return useSyncExternalStore((f) => (subs.add(f), () => void subs.delete(f)), () => query, () => "");
}
