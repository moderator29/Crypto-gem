"use client";

import { createLocalList, str } from "./store";

/** Tokens the visitor starred with the up arrow, kept on this device only. There are no shared counts. */
export const starsStore = createLocalList<string>("cg:starred", str, 500);

export function isStarred(key: string): boolean {
  return starsStore.read().includes(key);
}

/** Stars or un-stars a key and returns true when it is now starred. */
export function toggleStar(key: string): boolean {
  const on = !isStarred(key);
  starsStore.update((list) => (on ? [key, ...list] : list.filter((k) => k !== key)));
  return on;
}

export const useStars = starsStore.use;
