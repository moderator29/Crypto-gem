"use client";

import { LayoutGroup, motion } from "framer-motion";
import { Activity, BarChart3, Bot, Compass, Flame, Link2, Sparkles, LayoutDashboard, Megaphone, Menu, PlusCircle, Rocket, Search, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AuthButton } from "@/components/auth/AuthButton";
import { useT } from "@/components/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Logo } from "@/components/ui/Logo";
import type { MessageKey } from "@/lib/i18n/messages";
import { SearchDialog } from "./SearchDialog";
import { ThemePill, ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/markets", key: "nav.markets", icon: BarChart3 },
  { href: "/pulse", key: "nav.pulse", icon: Activity },
  { href: "/promotion", key: "nav.promotion", icon: Megaphone },
  { href: "/boost", key: "nav.boost", icon: Rocket },
  { href: "/copilot", key: "nav.copilot", icon: Bot },
] as const satisfies ReadonlyArray<{ href: string; key: MessageKey; icon: unknown }>;

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));
const SPRING = { type: "spring", stiffness: 420, damping: 38 } as const;

export function SiteChrome({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  const path = usePathname();
  const { t } = useT();
  const navGroup = useId();
  const dockGroup = useId();
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      // "/" opens search, the convention on most data sites, unless the user is typing somewhere.
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Drawer: Escape closes, focus moves in and returns to the menu button, and navigation closes it.
  useEffect(() => {
    if (!drawer) return;
    const prev = document.activeElement as HTMLElement | null;
    drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [drawer]);
  useEffect(() => {
    const id = setTimeout(() => setDrawer(false), 0);
    return () => clearTimeout(id);
  }, [path]);

  return (
    <>
      <div className="aurora" aria-hidden="true" />
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--surface-3)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold">Skip to content</a>

      <header className="site-header sticky top-0 z-50">
        <div className="mx-auto flex h-[var(--header-h)] max-w-[1360px] items-center gap-3 px-4">
          <button type="button" className="btn btn-icon xl:hidden" aria-label={t("menu.open")} aria-expanded={drawer} onClick={() => setDrawer(true)}>
            <Menu size={20} />
          </button>
          <Link href="/" aria-label="Crypto Gems home" className="mr-3">
            <Logo />
          </Link>

          <LayoutGroup id={navGroup}>
            <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Primary">
              {NAV.map((n) => {
                const active = isActive(path, n.href);
                return (
                  <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={`relative rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${active ? "text-text" : "text-soft hover:text-text"}`}>
                    {active && <motion.span layoutId="nav-active" transition={SPRING} className="absolute inset-0 rounded-lg bg-[var(--surface-3)] shadow-[inset_0_0_0_1px_var(--line-2)]" />}
                    {active && <motion.span layoutId="nav-underline" transition={SPRING} className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded bg-[var(--brand)] shadow-[0_0_12px_var(--neon-glow)]" />}
                    <span className="relative z-10">{t(n.key)}</span>
                  </Link>
                );
              })}
            </nav>
          </LayoutGroup>

          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => setSearchOpen(true)} className="btn hidden !justify-start gap-3 text-muted sm:inline-flex sm:w-44 xl:w-64" aria-label="Search">
              <Search size={16} aria-hidden="true" /> <span className="text-sm font-medium">{t("search.tokens")}</span>
              <kbd className="ml-auto rounded-md border border-line px-1.5 text-[11px]">/</kbd>
            </button>
            <button type="button" onClick={() => setSearchOpen(true)} className="btn btn-icon sm:hidden" aria-label="Search">
              <Search size={18} />
            </button>
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link href="/add-coin" className="btn btn-primary hidden sm:inline-flex">
              <PlusCircle size={16} /> {t("nav.addCoin")}
            </Link>
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <AuthButton className="hidden sm:block" />
          </div>
        </div>
      </header>

      {drawer && (
        <div className="fixed inset-0 z-[70] xl:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 animate-[fade_var(--dur-3)_ease-out_both] bg-black/60 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside ref={drawerRef} className="absolute inset-y-0 left-0 flex w-[86%] max-w-xs animate-[slide-in_var(--dur-3)_var(--ease-out)_both] flex-col overflow-y-auto border-r border-line bg-[var(--surface-1)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <Logo />
              <button type="button" className="btn btn-icon" aria-label="Close menu" onClick={() => setDrawer(false)}>
                <X size={18} />
              </button>
            </div>
            <DrawerLink href="/" label={t("nav.discover")} icon={Compass} active={isActive(path, "/")} />
            <p className="eyebrow px-3 pb-1 pt-5">Start exploring</p>
            <DrawerLink href="/markets" label="Markets" icon={BarChart3} active={path === "/markets"} />
            <DrawerLink href="/markets/new" label="New pairs" icon={Sparkles} active={path.startsWith("/markets/new")} />
            <DrawerLink href="/markets/heating" label="Heating up" icon={Flame} active={path.startsWith("/markets/heating")} />
            <DrawerLink href="/chains" label="Chains" icon={Link2} active={path.startsWith("/chains")} />
            <DrawerLink href="/pulse" label={t("nav.pulse")} icon={Activity} active={isActive(path, "/pulse")} />
            <DrawerLink href="/copilot" label={t("nav.copilot")} icon={Bot} active={isActive(path, "/copilot")} />
            <p className="eyebrow px-3 pb-1 pt-5">Other</p>
            <DrawerLink href="/promotion" label={t("nav.promotion")} icon={Megaphone} active={isActive(path, "/promotion")} />
            <DrawerLink href="/boost" label={t("nav.boost")} icon={Rocket} active={isActive(path, "/boost")} />
            <DrawerLink href="/dashboard" label={t("nav.dashboard")} icon={LayoutDashboard} active={isActive(path, "/dashboard")} />
            <DrawerLink href="/settings" label={t("nav.settings")} icon={Settings} active={isActive(path, "/settings")} />
            <div className="mt-auto flex flex-col gap-3 border-t border-line pt-4">
              <Link href="/add-coin" className="btn btn-primary w-full">
                <PlusCircle size={16} /> {t("nav.addCoin")}
              </Link>
              <AuthButton className="w-full [&>button]:w-full" />
              <div className="flex items-center justify-between gap-3">
                <ThemePill />
                <LanguageSwitcher />
              </div>
            </div>
          </aside>
        </div>
      )}

      <main id="content" className="mx-auto w-full max-w-[1360px] px-4 pt-6 md:pt-8">{children}</main>
      {footer}

      <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(env(safe-area-inset-bottom),10px)] xl:hidden" aria-label="Mobile">
        <LayoutGroup id={dockGroup}>
          <div className="mx-auto grid h-[60px] max-w-md grid-cols-5 items-center border border-[var(--line-2)] bg-[var(--float)] px-1.5 shadow-[var(--shadow-lg)] backdrop-blur-xl">
            <DockLink href="/" label={t("nav.home")} icon={Compass} active={isActive(path, "/")} />
            <DockLink href="/markets" label={t("nav.markets")} icon={BarChart3} active={isActive(path, "/markets")} />
            <Link href="/add-coin" aria-label={t("nav.addCoin")} className="btn btn-primary btn-icon mx-auto -mt-6 !h-[52px] !w-[52px] shadow-[0_8px_24px_rgba(10,90,255,0.5)]">
              <PlusCircle size={24} />
            </Link>
            <DockLink href="/copilot" label={t("nav.ai")} icon={Bot} active={isActive(path, "/copilot")} />
            <DockLink href="/boost" label={t("nav.boost")} icon={Rocket} active={isActive(path, "/boost")} />
          </div>
        </LayoutGroup>
      </nav>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function DockLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Compass; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`relative mx-auto flex h-12 w-14 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${active ? "text-brand" : "text-muted"}`}>
      {active && <motion.span layoutId="dock-active" transition={SPRING} className="absolute inset-0 rounded-lg bg-[color-mix(in_srgb,var(--brand)_14%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand)_30%,transparent)]" />}
      <Icon size={20} aria-hidden="true" className="relative z-10" />
      <span className="relative z-10">{label}</span>
    </Link>
  );
}

function DrawerLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Compass; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded px-3 text-[13px] font-bold uppercase tracking-wider transition-colors ${active ? "bg-[var(--surface-3)] text-text shadow-[inset_2px_0_0_var(--brand)]" : "text-soft hover:bg-[var(--surface-2)] hover:text-text"}`}>
      <Icon size={19} aria-hidden="true" className={active ? "text-brand" : ""} /> {label}
    </Link>
  );
}
