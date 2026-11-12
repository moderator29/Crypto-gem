"use client";

import { Star } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { assetKey } from "@/lib/market-data/identifiers";
import { enrichWatchItem, toggleWatchlist, useLocalWatchlist } from "@/lib/local/watchlist";

/** Star that adds or removes a token from the watchlist saved on this device. No account needed. */
export function WatchStar({ network, address, symbol, name, logo = null }: { network: string; address: string; symbol: string; name?: string; logo?: string | null }) {
  const toast = useToast();
  const list = useLocalWatchlist();
  const key = assetKey(network, address);
  const on = list.some((i) => assetKey(i.network, i.address) === key);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const now = toggleWatchlist({ network, address, symbol, name: name ?? symbol, logo });
    if (now && !logo) void enrichWatchItem(network, address);
    toast.success(now ? `Added ${symbol} to your watchlist` : `Removed ${symbol} from your watchlist`, now ? "Saved on this device." : undefined);
  }

  return (
    <button type="button" onClick={toggle} aria-pressed={on} aria-label={on ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`} className={`relative z-10 grid h-9 w-9 place-items-center rounded-lg transition hover:bg-[var(--surface-3)] ${on ? "text-warm" : "text-muted hover:text-text"}`}>
      <Star size={17} fill={on ? "currentColor" : "none"} />
    </button>
  );
}
