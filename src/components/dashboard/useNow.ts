"use client";

import { useEffect, useState } from "react";

/** Current time in ms, refreshed every second while `enabled`. Null until the first client tick so server and client markup agree. */
export function useNow(enabled = true): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    if (!enabled) return () => clearTimeout(first);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [enabled]);
  return now;
}
