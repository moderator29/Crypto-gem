"use client";

import { Star } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { assetKey } from "@/lib/market-data/identifiers";
import { enrichWatchItem, toggleWatchlist, useLocalWatchlist } from "@/lib/local/watchlist";

/** Watch toggle for a token page. The watchlist is saved on this device, so it works without an account. */
export function WatchButton({ network, address, symbol = "", name = "", logo = null }: { network: string; address: string; symbol?: string; name?: string; logo?: string | null }) {
  const toast = useToast();
  const list = useLocalWatchlist();
  const key = assetKey(network, address);
  const on = list.some((i) => assetKey(i.network, i.address) === key);

  function toggle() {
    const now = toggleWatchlist({ network, address, symbol, name, logo });
    if (now && (!symbol || !logo)) void enrichWatchItem(network, address);
    toast.success(now ? "Added to your watchlist" : "Removed from your watchlist", now ? "Saved on this device." : undefined);
  }

  return (
    <button type="button" className="btn btn-sm" aria-pressed={on} onClick={toggle}>
      <Star size={14} className={on ? "fill-[var(--warm)] text-warm" : ""} /> {on ? "Watching" : "Watch"}
    </button>
  );
}
