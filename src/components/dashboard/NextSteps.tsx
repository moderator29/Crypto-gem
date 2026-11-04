"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { CountUp } from "@/components/fx/CountUp";
import { Meter } from "@/components/ui/Kit";
import { completion, type NextStep } from "./logic";

/** Setup checklist with an animated completion meter. Items come from the person's real rows. */
export function NextSteps({ steps, className = "" }: { steps: NextStep[]; className?: string }) {
  const pct = completion(steps);
  const all = steps.every((s) => s.done === true);
  return (
    <section aria-label="Next steps" className={`card card-lit space-y-4 p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="h3">{all ? "You are all set" : "Next steps"}</h2>
        <span className="text-sm font-semibold text-soft"><CountUp value={pct} kind="pct" /> complete</span>
      </div>
      <Meter value={pct} tone={all ? "up" : "brand"} label="Setup completion" />
      <ul className="stagger grid gap-2 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.key}>
            <Link href={s.href} className={`card-flat flex items-center gap-3 p-3 transition hover:border-[var(--brand)] ${s.done ? "opacity-80" : ""}`}>
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors ${s.done ? "border-[var(--up)] bg-[var(--up)] text-black" : "border-[var(--line-2)] text-transparent"}`}>{s.done ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : null}</span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${s.done ? "line-through decoration-[var(--line-2)]" : ""}`}>{s.label}</span>
                <span className="block truncate text-xs text-muted">{s.done === null ? "Checking" : s.hint}</span>
              </span>
              {!s.done && <ArrowRight size={15} className="shrink-0 text-muted" aria-hidden="true" />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
