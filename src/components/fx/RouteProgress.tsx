"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** A thin brand-coloured bar at the top of the page that fills while a navigation is in flight. */
export function RouteProgress() {
  const path = usePathname();
  const [w, setW] = useState(0);
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest("a");
      const href = a?.getAttribute("href");
      if (!a || !href || !href.startsWith("/") || href.startsWith("//") || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return;
      if (href.split(/[?#]/)[0] === window.location.pathname) return;
      setOn(true);
      setW(12);
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(() => setW((x) => (x < 88 ? x + (90 - x) * 0.12 : x)), 160);
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    const a = setTimeout(() => setW(100), 0);
    const b = setTimeout(() => setOn(false), 320);
    const c = setTimeout(() => setW(0), 560);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(c);
    };
  }, [path]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-[3px]" style={{ opacity: on ? 1 : 0, transition: "opacity 220ms ease" }}>
      <div className="h-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand-2)] shadow-[0_0_12px_var(--neon-glow)]" style={{ width: `${w}%`, transition: "width 220ms ease-out" }} />
    </div>
  );
}
