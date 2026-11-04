"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

/** Appears after scrolling. The ring around the arrow fills as you read down the page. */
export function BackToTop() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const show = p > 0.08;
  const C = 2 * Math.PI * 20;
  return (
    <button type="button" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })} className={`fixed bottom-5 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-[var(--surface-2)] shadow-[var(--shadow-md)] transition-all duration-300 ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}>
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="none" stroke="var(--line-2)" strokeWidth="2.5" /><circle cx="24" cy="24" r="20" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p)} /></svg>
      <ArrowUp size={18} />
    </button>
  );
}
