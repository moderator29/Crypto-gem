"use client";

import { useEffect, useRef, useState } from "react";

/** A number that glides to its new value whenever it changes, so live results feel alive without flicker while typing. */
export function LiveNumber({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = from.current;
    const t0 = performance.now();
    const dur = reduce ? 0 : 380;
    let raf = 0;
    const tick = (t: number) => {
      const p = dur === 0 ? 1 : Math.min(1, (t - t0) / dur);
      const next = p >= 1 ? value : start + (value - start) * (1 - Math.pow(1 - p, 3));
      from.current = next;
      setShown(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className={`num ${className ?? ""}`}>{format(shown)}</span>;
}
