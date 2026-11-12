"use client";

import { assetKey } from "@/lib/market-data/identifiers";
import { createLocalList, isRecord, str } from "./store";

/** One followed token, saved on this device only. */
export interface LocalWatchItem { network: string; address: string; symbol: string; name: string; logo: string | null; at: number }

const isItem = (x: unknown): x is LocalWatchItem => isRecord(x) && str(x.network) && str(x.address) && str(x.symbol) && str(x.name) && (x.logo === null || str(x.logo)) && typeof x.at === "number";

export const watchlistStore = createLocalList<LocalWatchItem>("cg:watchlist", isItem, 200);

const same = (i: { network: string; address: string }, network: string, address: string) => assetKey(i.network, i.address) === assetKey(network, address);

export function isWatched(network: string, address: string): boolean {
  return watchlistStore.read().some((i) => same(i, network, address));
}

/** Adds a token to the top of the list, or refreshes its name and logo when it is already there. */
export function addToWatchlist(t: Omit<LocalWatchItem, "at">): void {
  watchlistStore.update((list) => [{ ...t, at: Date.now() }, ...list.filter((i) => !same(i, t.network, t.address))]);
}

export function removeFromWatchlist(network: string, address: string): void {
  watchlistStore.update((list) => list.filter((i) => !same(i, network, address)));
}

/** Toggles a token and returns true when it is now watched. */
export function toggleWatchlist(t: Omit<LocalWatchItem, "at">): boolean {
  if (isWatched(t.network, t.address)) {
    removeFromWatchlist(t.network, t.address);
    return false;
  }
  addToWatchlist(t);
  return true;
}

export const useLocalWatchlist = watchlistStore.use;

/**
 * Fills in a missing name, symbol or logo for a watched token from the public search API.
 * Used when a token was added from a place that only knew its address.
 */
export async function enrichWatchItem(network: string, address: string): Promise<void> {
  const item = watchlistStore.read().find((i) => same(i, network, address));
  if (!item || (item.symbol && item.logo)) return;
  try {
    const r = await fetch(`/api/search?${new URLSearchParams({ q: address })}`);
    if (!r.ok) return;
    const j = (await r.json()) as { results?: Array<{ networkId: string; address: string; name: string; symbol: string; imageUrl: string | null }> };
    const hit = j.results?.find((h) => same({ network: h.networkId, address: h.address }, network, address));
    if (!hit) return;
    watchlistStore.update((list) => list.map((i) => (same(i, network, address) ? { ...i, symbol: i.symbol || hit.symbol, name: i.name || hit.name, logo: i.logo ?? hit.imageUrl } : i)));
  } catch {
    watchlistStore.refresh();
  }
}
