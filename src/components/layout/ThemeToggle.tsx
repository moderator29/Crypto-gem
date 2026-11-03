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
      className={`btn !px-0 w-11 ${className}`}
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
