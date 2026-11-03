"use client";

import { BarChart3, Clock, Megaphone, PlusCircle, TrendingUp, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";

type Item = { label: string; icon: LucideIcon } & ({ tab: string } | { href: string });

const ITEMS: Item[] = [
  { label: "Trending", icon: Zap, tab: "organic" },
  { label: "Top Gainers", icon: TrendingUp, tab: "gainers" },
  { label: "All Coins", icon: BarChart3, tab: "volume" },
  { label: "New Listings", icon: Clock, tab: "fresh" },
  { label: "Promote", icon: Megaphone, href: "/promotion" },
  { label: "Apply Listing", icon: PlusCircle, href: "/add-coin" },
];

const CLS = "glass-flat flex shrink-0 snap-start items-center gap-2 px-4 py-3 text-sm font-semibold text-soft transition hover:text-text";

export function QuickLinks() {
  return (
    <nav className="scroll-x" aria-label="Shortcuts">
      {ITEMS.map((l) =>
        "href" in l ? (
          <Link key={l.label} href={l.href} className={CLS}>
            <l.icon size={16} className="text-brand" /> {l.label}
          </Link>
        ) : (
          <button
            key={l.label}
            type="button"
            className={CLS}
            onClick={() => {
              window.dispatchEvent(new CustomEvent("cg:tab", { detail: l.tab }));
              document.getElementById("market")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <l.icon size={16} className="text-brand" /> {l.label}
          </button>
        ),
      )}
    </nav>
  );
}
