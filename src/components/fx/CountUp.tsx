"use client";

import { useEffect, useRef, useState } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A number that counts up from zero the first time it scrolls into view. Server-rendered with the final value. */
function usdShort(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

const FORMATS = {
  int: (n: number) => Math.round(n).toLocaleString("en-US"),
  usd: usdShort,
  pct: (n: number) => `${n.toFixed(1)}%`,
} as const;

/** `kind` picks the formatter by name, so server components can use this without passing functions across the boundary. */
export function CountUp({ value, kind = "int", duration = 1100, className }: { value: number; kind?: keyof typeof FORMATS; duration?: number; className?: string }) {
  const format = FORMATS[kind];
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    done.current = false;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting || done.current) return;
      done.current = true;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(value * eased);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return <span ref={ref} className={`num ${className ?? ""}`}>{format(shown)}</span>;
}
