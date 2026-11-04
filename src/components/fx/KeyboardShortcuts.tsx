"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";

const GO: Record<string, string> = { h: "/", m: "/markets", n: "/markets/new", w: "/dashboard/watchlist", a: "/alerts", t: "/tools", c: "/copilot", s: "/settings", b: "/boost" };
const ROWS: Array<[string, string]> = [
  ["/  or  Ctrl K", "Search tokens and jump to pages"],
  ["?", "Show this list"],
  ["g then h", "Go to Discover"],
  ["g then m", "Go to Markets"],
  ["g then n", "Go to New pairs"],
  ["g then w", "Go to Watchlist"],
  ["g then a", "Go to Price alerts"],
  ["g then t", "Go to Trader tools"],
  ["g then c", "Go to AI Copilot"],
  ["g then b", "Go to Boost"],
  ["g then s", "Go to Settings"],
  ["Esc", "Close any dialog"],
];

/** Global keyboard help (press ?) and two-key navigation (press g, then a letter). Ignored while typing in a field. */
export function KeyboardShortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let armed: ReturnType<typeof setTimeout> | null = null;
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "?") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (armed) {
        clearTimeout(armed);
        armed = null;
        const to = GO[e.key.toLowerCase()];
        if (to) {
          e.preventDefault();
          router.push(to);
        }
        return;
      }
      if (e.key === "g") armed = setTimeout(() => (armed = null), 1200);
    };
    window.addEventListener("keydown", on);
    return () => {
      window.removeEventListener("keydown", on);
      if (armed) clearTimeout(armed);
    };
  }, [router]);
  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts" description="Faster ways around the site.">
      <dl className="divide-y divide-[var(--line-1)]">
        {ROWS.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 py-2.5 text-sm">
            <dt className="text-soft">{v}</dt>
            <dd><kbd className="num rounded-md border border-[var(--line-2)] bg-[var(--surface-2)] px-2 py-1 text-xs font-semibold">{k}</kbd></dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
