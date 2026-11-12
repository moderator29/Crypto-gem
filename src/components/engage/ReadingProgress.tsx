"use client";

import { useEffect, useState } from "react";

/** Thin bar fixed to the top of the screen that fills as you read down the article. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = document.getElementById(targetId);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight * 0.6;
      setP(span <= 0 ? (r.top < 0 ? 1 : 0) : Math.min(1, Math.max(0, -r.top / span)));
    };
    const onScroll = () => {
      if (raf === 0) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf !== 0) cancelAnimationFrame(raf);
    };
  }, [targetId]);
  return <div className="read-bar" style={{ transform: `scaleX(${p})` }} role="progressbar" aria-label="Reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)} />;
}
