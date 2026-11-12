"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CopyViewLink, DensityToggle, FindBox } from "./ListTools";

/**
 * Sticky bar under the site header holding the view tabs and filters. Once the page scrolls it condenses:
 * padding tightens and the tab row folds away so the list keeps the room.
 */
export function MarketsBar({ tabs, filters }: { tabs: ReactNode; filters: ReactNode }) {
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    const on = () => setCondensed((c) => (c ? window.scrollY > 40 : window.scrollY > 140));
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <div className="mk-bar" data-condensed={condensed ? "true" : undefined}>
      <div className="mk-bar-tabs">{tabs}</div>
      <div className="mk-bar-tools">
        {filters}
        <FindBox />
        <DensityToggle />
        <CopyViewLink />
      </div>
    </div>
  );
}
