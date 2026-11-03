"use client";

import { LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import { useId } from "react";

export interface TabLink {
  href: string;
  label: string;
  count?: number;
}

/**
 * Tabs that are real links, so every tab has its own URL, browser history and shareable address.
 * The active pill slides between tabs instead of jumping.
 */
export function LinkTabs({ tabs, activeHref, label }: { tabs: TabLink[]; activeHref: string; label: string }) {
  const group = useId();
  return (
    <LayoutGroup id={group}>
      <nav aria-label={label} className="scroll-x">
        {tabs.map((t) => {
          const active = t.href === activeHref;
          return (
            <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={`relative inline-flex min-h-[var(--h-sm)] shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition-colors ${active ? "text-white" : "text-soft hover:text-text"}`}>
              {active && <motion.span layoutId="tab-pill" className="absolute inset-0 -z-0 rounded-full bg-gradient-to-b from-[#ff5a3c] to-[#e8432a] shadow-[0_4px_14px_rgba(232,67,42,0.3)]" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
              <span className="relative z-10">{t.label}</span>
              {t.count !== undefined && <span className={`num relative z-10 text-[11px] ${active ? "text-white/80" : "text-muted"}`}>{t.count}</span>}
            </Link>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}
