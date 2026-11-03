"use client";

import { Bot, Compass, Megaphone, Menu, PlusCircle, Rocket, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { SearchDialog } from "./SearchDialog";
import { ThemePill, ThemeToggle } from "./ThemeToggle";
import { Footer } from "./Footer";

const NAV = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/promotion", label: "Promotion", icon: Megaphone },
  { href: "/boost", label: "Boost", icon: Rocket },
  { href: "/copilot", label: "AI Copilot", icon: Bot },
] as const;

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
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
          <button type="button" className="btn !px-0 w-11 lg:hidden" aria-label="Open menu" onClick={() => setDrawer(true)}>
            <Menu size={20} />
          </button>
          <Link href="/" aria-label="Crypto Gems home" className="mr-2">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={isActive(path, n.href) ? "page" : undefined} className="rounded-full px-4 py-2 text-sm font-semibold text-soft transition hover:text-text aria-[current=page]:bg-[var(--border)] aria-[current=page]:text-text">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => setSearchOpen(true)} className="btn hidden !justify-start gap-3 !px-4 text-muted sm:inline-flex sm:w-64" aria-label="Search">
              <Search size={16} /> <span className="text-sm font-medium">Search tokens</span>
              <kbd className="ml-auto rounded-md border border-line px-1.5 text-[11px]">⌘K</kbd>
            </button>
            <button type="button" onClick={() => setSearchOpen(true)} className="btn !px-0 w-11 sm:hidden" aria-label="Search">
              <Search size={18} />
            </button>
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link href="/add-coin" className="btn btn-primary hidden sm:inline-flex">
              <PlusCircle size={16} /> Add Coin
            </Link>
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
            {[...NAV, { href: "/add-coin", label: "Apply Listing", icon: PlusCircle }].map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setDrawer(false)} aria-current={isActive(path, n.href) ? "page" : undefined} className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-semibold text-soft aria-[current=page]:bg-[var(--border)] aria-[current=page]:text-text">
                <n.icon size={19} /> {n.label}
              </Link>
            ))}
            <div className="mt-auto flex flex-col items-center gap-4 border-t border-line pt-4">
              <Link href="/add-coin" onClick={() => setDrawer(false)} className="btn btn-primary w-full">
                <PlusCircle size={16} /> Add Coin
              </Link>
              <ThemePill />
            </div>
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl px-4 pt-4">{children}</main>
      <Footer />

      <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(env(safe-area-inset-bottom),10px)] lg:hidden" aria-label="Mobile">
        <div className="glass mx-auto flex h-[56px] max-w-md items-center justify-around !rounded-full px-2 !bg-[var(--surface-solid)]">
          <BottomLink href="/" label="Home" icon={Compass} active={isActive(path, "/")} />
          <BottomLink href="/copilot" label="AI" icon={Bot} active={isActive(path, "/copilot")} />
          <Link href="/add-coin" aria-label="Add Coin" className="btn btn-primary -mt-6 !h-14 !min-h-14 w-14 !rounded-full !px-0 shadow-lg">
            <PlusCircle size={26} />
          </Link>
          <BottomLink href="/promotion" label="Promote" icon={Megaphone} active={isActive(path, "/promotion")} />
          <BottomLink href="/boost" label="Boost" icon={Rocket} active={isActive(path, "/boost")} />
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
