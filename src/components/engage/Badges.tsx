"use client";

import { Award, BookCheck, Bookmark, Calculator, ChevronDown, Flame, Library, Lock, Target, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BADGES, earnedNow, type BadgeIcon } from "@/lib/engage/badges";
import { markBadgesSeen } from "@/lib/engage/progress";
import { useProgressStats, useSeenBadges } from "@/lib/engage/useProgress";
import { ProgressRing } from "./ProgressRing";

const ICONS: Record<BadgeIcon, LucideIcon> = { book: BookCheck, books: Library, award: Award, target: Target, bookmark: Bookmark, calc: Calculator, flame: Flame };
const UNLOCK_MS = 2600;

/** Grid of badges earned from real actions on this device. Locked ones show how close you are. */
export function Badges({ slugs }: { slugs: string[] }) {
  const stats = useProgressStats(slugs);
  const seen = useSeenBadges();
  const nowIds = useMemo(() => earnedNow(stats), [stats]);
  const fresh = useMemo(() => nowIds.filter((id) => !seen.includes(id)), [nowIds, seen]);
  useEffect(() => {
    if (fresh.length === 0) return;
    const t = setTimeout(() => markBadgesSeen(fresh), UNLOCK_MS);
    return () => clearTimeout(t);
  }, [fresh]);
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {BADGES.map((b) => {
        const Icon = ICONS[b.icon];
        const p = b.progress(stats);
        const earned = nowIds.includes(b.id) || seen.includes(b.id);
        const isNew = fresh.includes(b.id);
        const pct = Math.min(100, (p.value / p.goal) * 100);
        return (
          <li key={b.id} className={`badge-tile ${earned ? "badge-tile-on" : "badge-tile-off"} ${isNew ? "badge-unlock" : ""}`}>
            <span className="badge-tile-icon">{earned ? <Icon size={20} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}</span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-semibold">{b.label}{isNew && <span className="badge badge-brand">New</span>}</p>
              <p className="text-xs text-muted">{b.how}</p>
              {!earned && (
                <div className="mt-1.5 flex items-center gap-2" aria-hidden="true">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]"><div className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-500" style={{ width: `${pct}%` }} /></div>
                  <span className="num text-[11px] text-muted">{Math.min(p.value, p.goal)}/{p.goal}</span>
                </div>
              )}
              <span className="sr-only">{earned ? "Earned" : `Locked, ${Math.min(p.value, p.goal)} of ${p.goal}`}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Collapsible card with the reading ring, streak and badges. Opens by itself when a badge has just unlocked. */
export function YourProgress({ slugs }: { slugs: string[] }) {
  const stats = useProgressStats(slugs);
  const seen = useSeenBadges();
  const [manual, setManual] = useState<boolean | null>(null);
  const earned = BADGES.filter((b) => earnedNow(stats).includes(b.id) || seen.includes(b.id)).length;
  const hasNew = earnedNow(stats).some((id) => !seen.includes(id));
  const open = manual ?? hasNew;
  return (
    <section className="card p-4 md:p-5" aria-labelledby="progress-h">
      <button type="button" className="flex w-full items-center gap-4 text-left" aria-expanded={open} aria-controls="progress-body" onClick={() => setManual(!open)}>
        <ProgressRing value={stats.read} total={stats.totalArticles} label={`${stats.read} of ${stats.totalArticles} guides read`} />
        <span className="min-w-0 flex-1">
          <span id="progress-h" className="h3 block">Your progress</span>
          <span className="mt-0.5 block text-sm text-soft">{stats.read} of {stats.totalArticles} guides read. {earned} of {BADGES.length} badges.</span>
          <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted"><Flame size={13} className={stats.streak > 0 ? "text-warm" : ""} aria-hidden="true" />{stats.streak > 0 ? `${stats.streak}-day streak` : "No streak yet"}</span>
        </span>
        <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div id="progress-body" inert={!open} className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="space-y-3 pt-4">
            <Badges slugs={slugs} />
            <p className="text-xs leading-relaxed text-muted">Badges and your streak come only from what you do on this site: guides marked read, quiz scores, saved scenarios and calculators used. They are stored in this browser and never sent anywhere, so clearing site data resets them. A streak counts days in a row on which you read a guide or took a quiz.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
