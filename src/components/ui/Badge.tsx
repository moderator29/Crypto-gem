import type { ReactNode } from "react";

type Tone = "neutral" | "brand" | "up" | "down" | "warn" | "sponsored";
const TONE: Record<Tone, string> = { neutral: "", brand: "badge-brand", up: "badge-up", down: "badge-down", warn: "badge-warn", sponsored: "badge-sponsored" };

/** Informational label. Never interactive, so it never looks like a button. */
export function Badge({ tone = "neutral", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={`badge ${TONE[tone]} ${className}`}>{children}</span>;
}
