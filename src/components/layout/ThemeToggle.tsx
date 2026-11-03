"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
};
const snapshot = () => document.documentElement.getAttribute("data-theme") ?? "dark";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "dark");
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className={`btn btn-icon ${className}`}
      aria-label={`Switch to ${next} theme`}
      onClick={() => {
        document.documentElement.setAttribute("data-theme", next);
        try {
          localStorage.setItem("cg-theme", next);
        } catch {
          /* storage unavailable: the choice still applies for this visit */
        }
      }}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

/** Sun/moon segmented pill for the drawer. */
export function ThemePill() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "dark");
  const set = (t: "light" | "dark") => {
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("cg-theme", t);
    } catch {
      /* storage unavailable: the choice still applies for this visit */
    }
  };
  return (
    <div className="inline-flex rounded border border-line bg-[var(--surface)] p-1" role="group" aria-label="Theme">
      {(["light", "dark"] as const).map((t) => (
        <button key={t} type="button" aria-pressed={theme === t} aria-label={`${t} theme`} onClick={() => set(t)} className={`grid h-10 w-14 place-items-center rounded transition ${theme === t ? "bg-[var(--bg-elev)] text-text shadow" : "text-muted"}`}>
          {t === "light" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      ))}
    </div>
  );
}
