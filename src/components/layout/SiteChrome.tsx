"use client";

import { Bot, Compass, LayoutDashboard, Megaphone, Menu, PlusCircle, Rocket, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { SearchDialog } from "./SearchDialog";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useT } from "@/components/i18n/I18nProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import { ThemePill, ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/", key: "nav.discover", icon: Compass },
  { href: "/promotion", key: "nav.promotion", icon: Megaphone },
  { href: "/boost", key: "nav.boost", icon: Rocket },
  { href: "/copilot", key: "nav.copilot", icon: Bot },
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
] as const satisfies ReadonlyArray<{ href: string; key: MessageKey; icon: unknown }>;

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function SiteChrome({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  const path = usePathname();
  const { t } = useT();
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="aurora" aria-hidden="true" />
      <header className="sticky top-0 z-50 border-b border-line bg-[var(--surface)] backdrop-blur-xl">
        <div className="mx-auto flex h-[var(--header-h)] max-w-7xl items-center gap-3 px-4">
          <button type="button" className="btn !px-0 w-11 lg:hidden" aria-label={t("menu.open")} onClick={() => setDrawer(true)}>
            <Menu size={20} />
          </button>
          <Link href="/" aria-label="Crypto Gems home" className="mr-2">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-0.5 lg:flex xl:gap-1" aria-label="Primary">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={isActive(path, n.href) ? "page" : undefined} className="rounded-full px-3 py-2 text-sm font-semibold text-soft transition xl:px-4 hover:text-text aria-[current=page]:bg-[var(--border)] aria-[current=page]:text-text">
                {t(n.key)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => setSearchOpen(true)} className="btn hidden !justify-start gap-3 !px-4 text-muted sm:inline-flex sm:w-44 xl:w-64" aria-label="Search">
              <Search size={16} /> <span className="text-sm font-medium">{t("search.tokens")}</span>
              <kbd className="ml-auto rounded-md border border-line px-1.5 text-[11px]">⌘K</kbd>
            </button>
            <button type="button" onClick={() => setSearchOpen(true)} className="btn !px-0 w-11 sm:hidden" aria-label="Search">
              <Search size={18} />
            </button>
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link href="/add-coin" className="btn btn-primary hidden sm:inline-flex">
              <PlusCircle size={16} /> {t("nav.addCoin")}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {drawer && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="glass absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col gap-2 !rounded-l-none !bg-[var(--surface-solid)] p-4">
            <div className="mb-2 flex items-center justify-between">
              <Logo />
              <button type="button" className="btn !px-0 w-11" aria-label="Close menu" onClick={() => setDrawer(false)}>
                <X size={18} />
              </button>
            </div>
            {[...NAV, { href: "/add-coin", key: "nav.applyListing" as const, icon: PlusCircle }].map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setDrawer(false)} aria-current={isActive(path, n.href) ? "page" : undefined} className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-semibold text-soft aria-[current=page]:bg-[var(--border)] aria-[current=page]:text-text">
                <n.icon size={19} /> {t(n.key)}
              </Link>
            ))}
            <div className="mt-auto flex flex-col items-center gap-4 border-t border-line pt-4">
              <Link href="/add-coin" onClick={() => setDrawer(false)} className="btn btn-primary w-full">
                <PlusCircle size={16} /> {t("nav.addCoin")}
              </Link>
              <ThemePill />
              <LanguageSwitcher />
            </div>
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl px-4 pt-4">{children}</main>
      {footer}

      <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(env(safe-area-inset-bottom),10px)] lg:hidden" aria-label="Mobile">
        <div className="glass mx-auto flex h-[56px] max-w-md items-center justify-around !rounded-full px-2 !bg-[var(--surface-solid)]">
          <BottomLink href="/" label={t("nav.home")} icon={Compass} active={isActive(path, "/")} />
          <BottomLink href="/copilot" label={t("nav.ai")} icon={Bot} active={isActive(path, "/copilot")} />
          <Link href="/add-coin" aria-label="Add Coin" className="btn btn-primary -mt-6 !h-14 !min-h-14 w-14 !rounded-full !px-0 shadow-lg">
            <PlusCircle size={26} />
          </Link>
          <BottomLink href="/promotion" label={t("nav.promote")} icon={Megaphone} active={isActive(path, "/promotion")} />
          <BottomLink href="/boost" label={t("nav.boost")} icon={Rocket} active={isActive(path, "/boost")} />
        </div>
      </nav>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function BottomLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Compass; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`flex h-11 w-14 flex-col items-center justify-center text-[10px] font-semibold ${active ? "text-brand" : "text-muted"}`}>
      <Icon size={20} />
      {label}
    </Link>
  );
}
