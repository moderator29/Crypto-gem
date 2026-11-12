"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import { NavIcon, type NavIconName } from "@/components/ui/NavIcon";
import type { MessageKey } from "@/lib/i18n/messages";

type Item = { key: MessageKey; icon: NavIconName } & ({ tab: string } | { href: string });

const ITEMS: Item[] = [
  { key: "tab.trending", icon: "heating", tab: "trending" },
  { key: "quick.topGainers", icon: "pulse", tab: "gainers" },
  { key: "quick.allCoins", icon: "markets", tab: "marketcap" },
  { key: "tab.losers", icon: "fresh", tab: "losers" },
  { key: "nav.promote", icon: "promo", href: "/promotion" },
  { key: "nav.applyListing", icon: "add", href: "/add-coin" },
];

const CLS = "card-flat nav-tile hover-lift flex shrink-0 snap-start items-center gap-2.5 px-4 py-3 text-sm font-semibold text-soft transition hover:text-text";

/** Shortcut chips under the banners. Icons nudge on hover. Tab shortcuts switch the board below without leaving the page. */
export function QuickLinks() {
  const { t } = useT();
  return (
    <nav className="scroll-x" aria-label="Shortcuts">
      {ITEMS.map((l) =>
        "href" in l ? (
          <Link key={l.key} href={l.href} className={CLS}>
            <NavIcon name={l.icon} size={19} /> {t(l.key)}
          </Link>
        ) : (
          <Link key={l.key} href={`/trending?tab=${l.tab}`} className={CLS}>
            <NavIcon name={l.icon} size={19} /> {t(l.key)}
          </Link>
        ),
      )}
    </nav>
  );
}
