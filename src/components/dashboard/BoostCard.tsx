"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { timeLeft, type BoostPhase } from "./logic";
import type { Overview } from "./DashboardProvider";

type Boost = Overview["boosts"][number];
const R = 26;
const C = 2 * Math.PI * R;
const utc = (iso: string | null) => (iso ? `${new Date(iso).toISOString().slice(0, 16).replace("T", " ")} UTC` : "—");

/** SVG countdown ring: the arc is the share of the boost still left. */
function Ring({ fraction, phase, children }: { fraction: number; phase: BoostPhase; children: React.ReactNode }) {
  const color = phase === "running" ? "var(--brand)" : "var(--line-2)";
  return (
    <span className="relative grid h-[68px] w-[68px] shrink-0 place-items-center">
      <svg viewBox="0 0 64 64" width="68" height="68" className="-rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="5" />
        <circle className="boost-ring-arc" cx="32" cy="32" r={R} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - (phase === "running" ? fraction : 0))} />
      </svg>
      <span className="absolute inset-0 grid place-items-center">{children}</span>
    </span>
  );
}

/** One boost with its phase. Running boosts count down from the real end time; one that ends while open switches to a quiet ended state. */
export function BoostCard({ boost, now, phase }: { boost: Boost; now: number | null; phase: BoostPhase }) {
  const left = now === null ? null : timeLeft(boost.starts_at, boost.ends_at, now);
  return (
    <li className={`boost-card card flex items-center gap-4 p-4 ${phase === "ended" ? "fx-pop" : ""}`} data-phase={phase}>
      <Ring fraction={left?.fraction ?? 0} phase={phase}>
        {phase === "ended" ? <Check size={20} className="text-muted" aria-hidden="true" /> : phase === "running" ? <span className="num text-[10px] font-bold leading-none">{left ? `${Math.round(left.fraction * 100)}%` : "—"}</span> : <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Next</span>}
      </Ring>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{boost.projectName ?? "Project"} <span className="font-normal capitalize text-muted">· {boost.pack_id}</span></span>
        {phase === "running" && <span className="num block text-lg font-bold" role="timer" aria-label="Time left">{left?.label ?? "—"} <span className="text-xs font-medium text-muted">left</span></span>}
        {phase === "queued" && <span className="block text-sm text-soft">{boost.starts_at ? `Starts ${utc(boost.starts_at)}` : "Starts after payment is confirmed"}</span>}
        {phase === "ended" && <span className="block text-sm text-muted">Ended {utc(boost.ends_at)}</span>}
        <span className="num mt-0.5 block text-xs text-muted">{utc(boost.starts_at)} to {utc(boost.ends_at)}</span>
      </span>
      <Badge tone={phase === "running" ? "up" : phase === "queued" ? "warn" : "neutral"}>{phase === "running" ? "Running" : phase === "queued" ? "Queued" : "Ended"}</Badge>
    </li>
  );
}
