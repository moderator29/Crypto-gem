"use client";

import { LayoutGroup, motion } from "framer-motion";
import { Menu, PanelLeftClose, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthButton } from "@/components/auth/AuthButton";
import { useT } from "@/components/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Logo } from "@/components/ui/Logo";
import { NavIcon, type NavIconName } from "@/components/ui/NavIcon";
import { setSoundPrefs, useSoundPrefs, playSound } from "@/components/fx/sound";
import { SearchDialog } from "./SearchDialog";
import { ThemeToggle } from "./ThemeToggle";

interface NavItem { href: string; label: string; icon: NavIconName; match?: (p: string) => boolean }
interface NavGroup { title: string | null; items: NavItem[] }

const GROUPS: NavGroup[] = [
  { title: null, items: [{ href: "/", label: "Discover", icon: "home", match: (p) => p === "/" }] },
  {
    title: "Markets",
    items: [
      { href: "/markets", label: "Markets", icon: "markets", match: (p) => p === "/markets" },
      { href: "/markets/new", label: "New pairs", icon: "fresh", match: (p) => p.startsWith("/markets/new") },
      { href: "/markets/heating", label: "Heating up", icon: "heating", match: (p) => p.startsWith("/markets/heating") },
      { href: "/markets/map", label: "Price map", icon: "map", match: (p) => p.startsWith("/markets/map") },
      { href: "/chains", label: "Chains", icon: "chains", match: (p) => p.startsWith("/chains") },
    ],
  },
  {
    title: "Tools",
    items: [
      { href: "/copilot", label: "AI Copilot", icon: "copilot", match: (p) => p.startsWith("/copilot") },
      { href: "/pulse", label: "Market Pulse", icon: "pulse", match: (p) => p.startsWith("/pulse") },
      { href: "/compare", label: "Compare", icon: "compare", match: (p) => p.startsWith("/compare") },
      { href: "/status", label: "Data status", icon: "status", match: (p) => p.startsWith("/status") },
    ],
  },
  {
    title: "Grow a project",
    items: [
      { href: "/add-coin", label: "Add coin", icon: "add", match: (p) => p.startsWith("/add-coin") },
      { href: "/boost", label: "Boost", icon: "boost", match: (p) => p.startsWith("/boost") },
      { href: "/promotion", label: "Promotion", icon: "promo", match: (p) => p.startsWith("/promotion") },
    ],
  },
  {
    title: "Resources",
    items: [
      { href: "/tools", label: "Trader tools", icon: "tools", match: (p) => p.startsWith("/tools") },
      { href: "/learn", label: "Learn", icon: "learn", match: (p) => p.startsWith("/learn") },
      { href: "/glossary", label: "Glossary", icon: "log", match: (p) => p.startsWith("/glossary") },
      { href: "/help", label: "Help", icon: "help", match: (p) => p.startsWith("/help") },
      { href: "/changelog", label: "Changelog", icon: "log", match: (p) => p.startsWith("/changelog") },
    ],
  },
  {
    title: "Your account",
    items: [
      { href: "/profile", label: "Profile", icon: "home", match: (p) => p.startsWith("/profile") },
      { href: "/dashboard/watchlist", label: "Watchlist", icon: "star", match: (p) => p.startsWith("/dashboard/watchlist") },
      { href: "/alerts", label: "Price alerts", icon: "alert", match: (p) => p.startsWith("/alerts") },
      { href: "/notifications", label: "Notifications", icon: "inbox", match: (p) => p.startsWith("/notifications") },
      { href: "/dashboard", label: "Dashboard", icon: "dashboard", match: (p) => p === "/dashboard" || /^\/dashboard\/(listings|boosts|campaigns|payments)/.test(p) },
      { href: "/settings", label: "Settings", icon: "settings", match: (p) => p.startsWith("/settings") },
    ],
  },
];

const SPRING = { type: "spring", stiffness: 420, damping: 38 } as const;

/** The big navigation list. Used as the persistent desktop sidebar and inside the mobile drawer. */
function NavList({ path, id, collapsed = false }: { path: string; id: string; collapsed?: boolean }) {
  return (
    <LayoutGroup id={id}>
      <nav aria-label="Primary" className="flex flex-col gap-5">
        {GROUPS.map((g, gi) => (
          <div key={gi} className="flex flex-col gap-0.5">
            {g.title && (collapsed ? <span className="mx-auto my-1.5 block h-px w-6 bg-[var(--line-2)]" aria-hidden="true" /> : <p className="eyebrow px-3 pb-1.5">{g.title}</p>)}
            {g.items.map((n) => {
              const active = (n.match ?? ((p) => p === n.href))(path);
              return (
                <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} title={collapsed ? n.label : undefined} aria-label={collapsed ? n.label : undefined} className={`nav-row relative flex min-h-12 items-center gap-3.5 rounded-xl px-3 text-[15px] font-semibold transition-colors ${collapsed ? "justify-center" : ""} ${active ? "text-text" : "text-soft hover:text-text"}`}>
                  {active && <motion.span layoutId="nav-bg" transition={SPRING} className="absolute inset-0 rounded-xl bg-[var(--surface-3)] shadow-[inset_0_0_0_1px_var(--line-2)]" />}
                  {active && <motion.span layoutId="nav-bar" transition={SPRING} className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-[var(--brand)]" />}
                  <span className={`relative z-10 grid h-8 w-8 place-items-center rounded-lg ${active ? "bg-[color-mix(in_srgb,var(--brand)_14%,transparent)] text-text" : "text-soft"}`}><NavIcon name={n.icon} size={21} /></span>
                  {!collapsed && <span className="relative z-10">{n.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </LayoutGroup>
  );
}

export function SiteChrome({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  const path = usePathname();
  const { t } = useT();
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const sound = useSoundPrefs();
  const [rail, setRail] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        setRail(window.localStorage.getItem("cg:rail") === "1");
      } catch {
        setRail(false);
      }
    }, 0);
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      clearTimeout(id);
      window.removeEventListener("scroll", on);
    };
  }, []);
  const toggleRail = () => {
    setRail((r) => {
      try {
        window.localStorage.setItem("cg:rail", r ? "0" : "1");
      } catch {
        /* remembered for this visit only */
      }
      return !r;
    });
  };

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

      <header className={`site-header sticky top-0 z-50 transition-shadow duration-300 ${scrolled ? "shadow-[0_8px_30px_rgba(0,0,0,0.35)]" : ""}`}>
        <div className="mx-auto flex h-[var(--header-h)] max-w-[1640px] items-center gap-3 px-4">
          <button type="button" className="btn btn-icon xl:hidden" aria-label={t("menu.open")} aria-expanded={drawer} onClick={() => setDrawer(true)}>
            <Menu size={20} />
          </button>
          <Link href="/" aria-label="Crypto Gems home" className="mr-2 xl:w-56">
            <Logo />
          </Link>
          <button type="button" onClick={() => setSearchOpen(true)} className="btn hidden !justify-start gap-3 text-muted sm:inline-flex sm:w-64 lg:w-96" aria-label="Search">
            <Search size={16} aria-hidden="true" /> <span className="text-sm font-medium normal-case tracking-normal">{t("search.tokens")}</span>
            <kbd className="ml-auto rounded-md border border-line px-1.5 text-[11px]">/</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => setSearchOpen(true)} className="btn btn-icon sm:hidden" aria-label="Search">
              <Search size={18} />
            </button>
            <Link href="/notifications" className="btn btn-icon bell-ring" aria-label="Notifications">
              <NavIcon name="bell" size={20} />
            </Link>
            <button type="button" className="btn btn-icon hidden sm:inline-flex" aria-pressed={sound.enabled} aria-label={sound.enabled ? "Turn sound off" : "Turn sound on"} onClick={() => { setSoundPrefs({ enabled: !sound.enabled }); if (!sound.enabled) setTimeout(() => playSound("success"), 30); }}>
              <NavIcon name={sound.enabled ? "sound" : "mute"} size={19} />
            </button>
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link href="/add-coin" className="btn btn-primary hidden sm:inline-flex">
              <NavIcon name="add" size={18} className="[&_.acc]:!stroke-current" /> {t("nav.addCoin")}
            </Link>
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <AuthButton className="hidden sm:block" />
          </div>
        </div>
      </header>

      {drawer && (
        <div className="fixed inset-0 z-[70] xl:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 animate-[fade_var(--dur-3)_ease-out_both] bg-black/60 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside ref={drawerRef} className="sidebar-in absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col gap-5 overflow-y-auto border-r border-line bg-[var(--surface-1)] p-4">
            <div className="flex items-center justify-between">
              <Logo />
              <button type="button" className="btn btn-icon" aria-label="Close menu" onClick={() => setDrawer(false)}>
                <X size={18} />
              </button>
            </div>
            <AuthButton className="w-full [&>button]:w-full" />
            <NavList path={path} id="drawer-nav" />
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </aside>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1640px] items-start">
        <aside aria-label="Site navigation" className={`sticky top-[var(--header-h)] hidden h-[calc(100dvh-var(--header-h))] shrink-0 overflow-y-auto overflow-x-hidden border-r border-line py-5 transition-[width] duration-300 ease-out xl:block ${rail ? "w-[84px] px-2" : "w-64 px-3"}`}>
          <NavList path={path} id="side-nav" collapsed={rail} />
          <button type="button" onClick={toggleRail} aria-pressed={rail} aria-label={rail ? "Expand sidebar" : "Collapse sidebar"} className="btn btn-sm mt-6 w-full">
            <span className={`transition-transform duration-300 ${rail ? "rotate-180" : ""}`} aria-hidden="true"><PanelLeftClose size={16} /></span>
            {!rail && <span>Collapse</span>}
          </button>
        </aside>
        <div className="min-w-0 flex-1">
          <main id="content" className="mx-auto w-full max-w-[1240px] px-4 pt-6 md:pt-8">{children}</main>
          {footer}
        </div>
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
