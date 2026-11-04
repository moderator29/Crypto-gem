import type { Overview, WatchItem } from "./DashboardProvider";

export type StepState = "done" | "active" | "todo" | "blocked";
export interface JourneyStep { key: "submitted" | "payment" | "review" | "approved" | "live"; label: string; state: StepState; note?: string }

const LABELS: Array<[JourneyStep["key"], string]> = [["submitted", "Submitted"], ["payment", "Payment"], ["review", "In review"], ["approved", "Approved"], ["live", "Live"]];
const BLOCKED_AT: Record<string, { at: number; note: string }> = {
  rejected: { at: 2, note: "Rejected" },
  draft: { at: 2, note: "Changes requested" },
  cancelled: { at: 1, note: "Cancelled" },
  refunded: { at: 1, note: "Refunded" },
  suspended: { at: 4, note: "Suspended" },
  expired: { at: 4, note: "Expired" },
};
/** Index of the step a listing is currently on. */
const ACTIVE_AT: Record<string, number> = { draft: 0, submitted: 2, awaiting_payment: 1, pending_review: 2, payment_confirmed: 2, approved: 3, published: 4 };

/** Turns a stored listing status into the five-step journey shown on the dashboard. A blocked step carries the real reason when one was stored. */
export function listingJourney(status: string, reason: string | null): JourneyStep[] {
  const blocked = BLOCKED_AT[status];
  const active = ACTIVE_AT[status] ?? 0;
  return LABELS.map(([key, label], i) => {
    if (blocked) {
      if (i < blocked.at) return { key, label, state: "done" as const };
      if (i === blocked.at) return { key, label: blocked.note, state: "blocked" as const, note: reason?.trim() || undefined };
      return { key, label, state: "todo" as const };
    }
    if (status === "published") return { key, label, state: "done" as const };
    if (i < active) return { key, label, state: "done" as const };
    if (i === active) return { key, label, state: "active" as const };
    return { key, label, state: "todo" as const };
  });
}

export type BoostPhase = "running" | "queued" | "ended";
interface BoostLike { status: string; starts_at: string | null; ends_at: string | null }

/** Running boosts have started and not reached their end time. Waiting ones are queued. Everything else is over. */
export function boostPhase(b: BoostLike, now: number): BoostPhase {
  const end = b.ends_at ? Date.parse(b.ends_at) : NaN;
  const start = b.starts_at ? Date.parse(b.starts_at) : NaN;
  if (["completed", "expired", "cancelled", "refunded"].includes(b.status)) return "ended";
  if (Number.isFinite(end) && end <= now) return "ended";
  if (b.status === "scheduled" || b.status === "awaiting_payment" || b.status === "pending") return "queued";
  if (b.status === "active") return Number.isFinite(start) && start > now ? "queued" : "running";
  return "ended";
}

/** Remaining time split into parts, plus the fraction of the whole boost that is left (0 to 1). */
export function timeLeft(startIso: string | null, endIso: string | null, now: number): { ms: number; fraction: number; label: string } | null {
  const end = endIso ? Date.parse(endIso) : NaN;
  if (!Number.isFinite(end)) return null;
  const start = startIso ? Date.parse(startIso) : NaN;
  const ms = Math.max(0, end - now);
  const total = Number.isFinite(start) && end > start ? end - start : 0;
  const fraction = total > 0 ? Math.min(1, ms / total) : 0;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  const label = d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(s % 60)}`;
  return { ms, fraction, label };
}

export interface NextStep { key: string; label: string; hint: string; href: string; done: boolean | null }

/** Setup checklist computed from the person's own rows. `alerts` is null while that count is still loading or unavailable. */
export function nextSteps(data: Overview, watch: WatchItem[], alerts: number | null): NextStep[] {
  return [
    { key: "list", label: "List a coin", hint: "Paste a contract and we detect the rest", href: "/add-coin", done: data.submissions.length > 0 },
    { key: "boost", label: "Boost it", hint: "Clearly labelled sponsored visibility", href: "/boost", done: data.boosts.length > 0 },
    { key: "alert", label: "Set a price alert", hint: "Get told when a price crosses", href: "/alerts", done: alerts === null ? null : alerts > 0 },
    { key: "watch", label: "Add a coin to your watchlist", hint: "Follow tokens with live prices", href: "/markets", done: watch.length > 0 },
  ];
}

/** Share of completed checklist items, ignoring items whose state is not known yet. */
export function completion(steps: NextStep[]): number {
  const known = steps.filter((s) => s.done !== null);
  return known.length === 0 ? 0 : Math.round((known.filter((s) => s.done).length / steps.length) * 100);
}

export type DayGroup = "Today" | "Yesterday" | "Earlier";

/** Buckets an ISO timestamp by local calendar day. Unreadable dates fall into Earlier. */
export function dayGroup(iso: string, now = new Date()): DayGroup {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "Earlier";
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(t)) / 86_400_000);
  return diff <= 0 ? "Today" : diff === 1 ? "Yesterday" : "Earlier";
}
