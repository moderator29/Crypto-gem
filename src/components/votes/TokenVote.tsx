"use client";

import { ArrowUp } from "lucide-react";
import { playSound } from "@/components/fx/sound";
import { toggleStar, useStars } from "@/lib/local/stars";

/**
 * Up arrow that stars a token on this device. There is no shared vote count (that would need a
 * server), so no number is shown rather than an invented one.
 */
export function TokenVote({ network, address, className = "" }: { network: string; address: string; className?: string }) {
  const key = `${network}:${address}`;
  const on = useStars().includes(key);

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (toggleStar(key)) playSound("coin");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Starred by you on this device. Tap to undo" : "Star this token on this device"}
      title={on ? "Starred by you" : "Star it"}
      className={`relative z-10 grid h-8 w-9 shrink-0 place-items-center rounded-md border transition ${on ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--line-2)] bg-[var(--surface-3)] text-soft hover:border-[var(--brand)] hover:text-text"} ${className}`}
    >
      <ArrowUp size={16} />
    </button>
  );
}
