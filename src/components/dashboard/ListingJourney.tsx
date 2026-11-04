"use client";

import { Check, ChevronDown, Circle, X } from "lucide-react";
import { useState } from "react";
import { listingJourney } from "./logic";

/** Animated vertical timeline of a listing, driven by its stored status. The active step pulses with a ring. */
export function ListingJourney({ status, reason }: { status: string; reason: string | null }) {
  const steps = listingJourney(status, reason);
  const [open, setOpen] = useState(status !== "published");
  const current = steps.find((s) => s.state === "active" || s.state === "blocked") ?? steps[steps.length - 1]!;
  return (
    <div className="mt-3">
      <button type="button" className="flex w-full items-center justify-between gap-2 rounded-lg py-1 text-left text-xs font-semibold text-soft transition hover:text-text" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span>Progress: <span className={current.state === "blocked" ? "text-down" : "text-text"}>{current.label}</span></span>
        <ChevronDown size={15} aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ol className="journey mt-2" aria-label="Listing progress">
          {steps.map((s, i) => (
            <li key={s.key} className="journey-step" data-state={s.state} style={{ ["--i" as string]: i }} aria-current={s.state === "active" ? "step" : undefined}>
              <span className={`journey-dot ${s.state === "active" ? "fx-ring" : ""}`}>
                {s.state === "done" ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : s.state === "blocked" ? <X size={13} strokeWidth={3} aria-hidden="true" /> : s.state === "active" ? <Circle size={8} fill="currentColor" aria-hidden="true" /> : null}
              </span>
              <span className="min-w-0">
                <span className="journey-label">{s.label}</span>
                {s.note && <span className="journey-note">Reason: {s.note}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
