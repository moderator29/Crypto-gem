"use client";

import { Zap } from "lucide-react";
import { storePack } from "./packSelection";

/** Remembers the pack, then scrolls to the project picker where the buyer chooses the coin. */
export function PackBoostButton({ packId, label = "Boost with this pack", full = true }: { packId: string; label?: string; full?: boolean }) {
  return (
    <button
      type="button"
      className={`btn btn-primary ${full ? "w-full sm:w-auto" : "btn-sm"}`}
      onClick={() => {
        storePack(packId);
        document.getElementById("boost-projects")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      }}
    >
      <Zap size={14} aria-hidden="true" /> {label}
    </button>
  );
}
