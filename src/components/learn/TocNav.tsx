"use client";

import { useEffect, useState } from "react";

/** Table of contents that highlights the section being read. Plain anchor links, so it works without scripting too. */
export function TocNav({ items }: { items: Array<{ id: string; text: string }> }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => e !== null);
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-90px 0px -65% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  return (
    <nav aria-label="Contents">
      <ol className="space-y-0.5 border-l border-line">
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} aria-current={active === i.id ? "location" : undefined} className={`-ml-px block border-l-2 py-1.5 pl-3.5 text-sm transition-colors ${active === i.id ? "border-[var(--brand)] font-semibold text-text" : "border-transparent text-muted hover:text-text"}`}>{i.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
