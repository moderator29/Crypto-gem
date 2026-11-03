"use client";

import { useEffect, useRef } from "react";

/**
 * Fires one impression when at least half the ad has been visible for a
 * second. Page renders that nobody sees are not counted.
 */
export function AdBeacon({ campaignId, children }: { campaignId: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sent = false;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting && !sent) {
          timer = setTimeout(() => {
            sent = true;
            navigator.sendBeacon?.("/api/ads/imp", new Blob([JSON.stringify({ c: campaignId })], { type: "application/json" }));
            obs.disconnect();
          }, 1000);
        } else if (timer) clearTimeout(timer);
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      obs.disconnect();
    };
  }, [campaignId]);
  return <div ref={ref}>{children}</div>;
}
