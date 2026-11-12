"use client";

import { useEffect, useRef, useState } from "react";
import { priceUsd } from "@/lib/utils/format";

/** Token price that refreshes every 30 seconds while the tab is visible, flashing green or red when it moves. */
export function LivePrice({ network, address, initial }: { network: string; address: string; initial: number | null }) {
  const [price, setPrice] = useState(initial);
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  const last = useRef(initial);

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (document.visibilityState === "visible") {
        try {
          const r = await fetch(`/api/price?network=${network}&address=${encodeURIComponent(address)}`);
          const j = (await r.json()) as { priceUsd?: number | null };
          if (live && r.ok && typeof j.priceUsd === "number") {
            const before = last.current;
            last.current = j.priceUsd;
            setPrice(j.priceUsd);
            if (before !== null && before !== j.priceUsd) {
              setDir(j.priceUsd > before ? "up" : "down");
              setTimeout(() => live && setDir(null), 1100);
            }
          }
        } catch {
          /* keep showing the last price; the next tick tries again */
        }
      }
      if (live) timer = setTimeout(() => void tick(), 30_000);
    };
    timer = setTimeout(() => void tick(), 30_000);
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [network, address]);

  return (
    <span className="inline-flex items-center gap-2">
      <span className="fx-live-dot" title="Updates every 30 seconds" aria-hidden="true" />
      <span className={`rounded px-1 ${dir === "up" ? "flash-up" : dir === "down" ? "flash-down" : ""}`}>{priceUsd(price)}</span>
    </span>
  );
}
