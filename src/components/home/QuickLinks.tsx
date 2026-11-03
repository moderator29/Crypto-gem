"use client";

import { BarChart3, Clock, Megaphone, PlusCircle, TrendingUp, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import type { MessageKey } from "@/lib/i18n/messages";

type Item = { key: MessageKey; icon: LucideIcon } & ({ tab: string } | { href: string });

const ITEMS: Item[] = [
  { key: "tab.trending", icon: Zap, tab: "organic" },
  { key: "quick.topGainers", icon: TrendingUp, tab: "gainers" },
  { key: "quick.allCoins", icon: BarChart3, tab: "volume" },
  { key: "quick.newListings", icon: Clock, tab: "fresh" },
  { key: "nav.promote", icon: Megaphone, href: "/promotion" },
  { key: "nav.applyListing", icon: PlusCircle, href: "/add-coin" },
];

const CLS = "glass-flat flex shrink-0 snap-start items-center gap-2 px-4 py-3 text-sm font-semibold text-soft transition hover:text-text";

export function QuickLinks() {
  const { t } = useT();
  return (
    <nav className="scroll-x" aria-label="Shortcuts">
      {ITEMS.map((l) =>
        "href" in l ? (
          <Link key={l.key} href={l.href} className={CLS}>
            <l.icon size={16} className="text-brand" /> {t(l.key)}
          </Link>
        ) : (
          <button
            key={l.key}
            type="button"
            className={CLS}
            onClick={() => {
              window.dispatchEvent(new CustomEvent("cg:tab", { detail: l.tab }));
              document.getElementById("market")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <l.icon size={16} className="text-brand" /> {t(l.key)}
          </button>
        ),
      )}
    </nav>
  );
}
