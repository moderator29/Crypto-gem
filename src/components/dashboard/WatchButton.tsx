"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { accessToken } from "@/lib/supabase/browser";

/** Adds or removes a token from the signed-in user's watchlist. Signed-out users are sent to sign in, not shown a fake state. */
export function WatchButton({ network, address }: { network: string; address: string }) {
  const [state, setState] = useState<"loading" | "off" | "on" | "signin" | "unavailable">("loading");

  useEffect(() => {
    let live = true;
    (async () => {
      const jwt = await accessToken();
      if (!jwt) return live && setState("signin");
      const res = await fetch("/api/watchlist", { headers: { Authorization: `Bearer ${jwt}` } });
      if (!live) return;
      if (res.status === 503) return setState("unavailable");
      if (!res.ok) return setState("signin");
      const j = (await res.json()) as { items: Array<{ network: string; address: string }> };
      setState(j.items.some((i) => i.network === network && i.address.toLowerCase() === address.toLowerCase()) ? "on" : "off");
    })();
    return () => {
      live = false;
    };
  }, [network, address]);

  if (state === "unavailable") return null;
  if (state === "signin") return <Link href={`/login?next=/token/${network}/${address}`} className="btn !min-h-9 !px-3 text-xs"><Star size={14} /> Watch</Link>;

  async function toggle() {
    const jwt = await accessToken();
    if (!jwt) return setState("signin");
    const on = state === "on";
    setState(on ? "off" : "on");
    const res = await fetch(on ? `/api/watchlist?network=${network}&address=${encodeURIComponent(address)}` : "/api/watchlist", {
      method: on ? "DELETE" : "POST",
      headers: { Authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: on ? undefined : JSON.stringify({ network, address }),
    });
    if (!res.ok) setState(on ? "on" : "off");
  }

  return (
    <button type="button" className="btn !min-h-9 !px-3 text-xs" aria-pressed={state === "on"} disabled={state === "loading"} onClick={toggle}>
      <Star size={14} className={state === "on" ? "fill-[var(--warm)] text-warm" : ""} /> {state === "on" ? "Watching" : "Watch"}
    </button>
  );
}
