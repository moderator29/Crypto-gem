"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useToast } from "@/components/ui/Toast";
import { accessToken } from "@/lib/auth/client";

type Item = { network: string; address: string };
let watched = new Set<string>();
let loaded = false;
const subs = new Set<() => void>();
const keyOf = (n: string, a: string) => `${n}:${a}`;
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => (subs.add(f), () => void subs.delete(f));
const snapshot = () => watched;

async function loadOnce() {
  if (loaded) return;
  const jwt = await accessToken();
  if (!jwt) return;
  loaded = true;
  try {
    const res = await fetch("/api/watchlist", { headers: { Authorization: `Bearer ${jwt}` } });
    if (!res.ok) return;
    const json = (await res.json()) as { items: Item[] };
    watched = new Set(json.items.map((i) => keyOf(i.network, i.address)));
    emit();
  } catch {
    loaded = false;
  }
}

/** Star that adds or removes a token from the signed in user's watchlist. Signed out users are sent to sign in. */
export function WatchStar({ network, address, symbol }: { network: string; address: string; symbol: string }) {
  const router = useRouter();
  const toast = useToast();
  const set = useSyncExternalStore(subscribe, snapshot, snapshot);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void loadOnce();
  }, []);
  const key = keyOf(network, address);
  const on = set.has(key);

  async function toggle() {
    const jwt = await accessToken();
    if (!jwt) {
      router.push(`/login?next=${encodeURIComponent("/dashboard/watchlist")}`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(on ? `/api/watchlist?network=${network}&address=${encodeURIComponent(address)}` : "/api/watchlist", {
        method: on ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
        body: on ? undefined : JSON.stringify({ network, address }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Could not update watchlist");
      const next = new Set(watched);
      if (on) next.delete(key);
      else next.add(key);
      watched = next;
      emit();
      toast.success(on ? `Removed ${symbol} from watchlist` : `Added ${symbol} to watchlist`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update watchlist");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" disabled={busy} onClick={() => void toggle()} aria-pressed={on} aria-label={on ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`} className={`relative z-10 grid h-9 w-9 place-items-center rounded-lg transition hover:bg-[var(--surface-3)] ${on ? "text-warm" : "text-muted hover:text-text"}`}>
      <Star size={17} fill={on ? "currentColor" : "none"} />
    </button>
  );
}
