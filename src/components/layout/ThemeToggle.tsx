"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
};
/** Applies a theme. Where the browser supports view transitions the new theme spreads outward from the click point. */
export function applyTheme(next: "light" | "dark", from?: { x: number; y: number }): void {
  const set = () => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("cg-theme", next);
    } catch {
      /* storage unavailable: the choice still applies for this visit */
    }
  };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return set();
  const x = from?.x ?? window.innerWidth / 2;
  const y = from?.y ?? 0;
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  void doc.startViewTransition(set).ready.then(() => {
    document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] }, { duration: 520, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" });
  }, () => undefined);
}

const snapshot = () => document.documentElement.getAttribute("data-theme") ?? "dark";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "dark");
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className={`btn btn-icon ${className}`}
      aria-label={`Switch to ${next} theme`}
      onClick={(e) => applyTheme(next, { x: e.clientX, y: e.clientY })}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

/** Sun/moon segmented pill for the drawer. */
export function ThemePill() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "dark");
  const set = (t: "light" | "dark") => applyTheme(t);
  return (
    <div className="inline-flex rounded-full border border-line bg-[var(--surface)] p-1" role="group" aria-label="Theme">
      {(["light", "dark"] as const).map((t) => (
        <button key={t} type="button" aria-pressed={theme === t} aria-label={`${t} theme`} onClick={() => set(t)} className={`grid h-10 w-14 place-items-center rounded-full transition ${theme === t ? "bg-[var(--bg-elev)] text-text shadow" : "text-muted"}`}>
          {t === "light" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      ))}
    </div>
  );
}
