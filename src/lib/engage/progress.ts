import { readRaw, safeJson, writeRaw } from "./store";

/** Every key this feature set writes. All data stays in this browser. */
export const KEYS = {
  read: "cg:learn:read",
  quiz: "cg:learn:quiz",
  days: "cg:engage:days",
  tools: "cg:engage:tools",
  saved: "cg:engage:saved",
  seen: "cg:engage:badges-seen",
  votes: "cg:help:votes",
} as const;

export interface QuizBest { best: number; total: number }
export type Vote = "up" | "down";

const MAX_LIST = 200;
const MAX_DAYS = 120;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse a stored list of short unique strings. */
export function parseStringList(raw: string | null): string[] {
  const data = safeJson(raw);
  if (!Array.isArray(data)) return [];
  const out: string[] = [];
  for (const v of data) if (typeof v === "string" && v.length > 0 && v.length <= 80 && !out.includes(v)) out.push(v);
  return out.slice(0, MAX_LIST);
}

/** Parse stored best quiz scores keyed by article slug. */
export function parseQuiz(raw: string | null): Record<string, QuizBest> {
  const data = safeJson(raw);
  const out: Record<string, QuizBest> = {};
  if (typeof data !== "object" || data === null || Array.isArray(data)) return out;
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (typeof v !== "object" || v === null) continue;
    const o = v as Record<string, unknown>;
    const best = o.best;
    const total = o.total;
    if (typeof best === "number" && typeof total === "number" && Number.isInteger(best) && Number.isInteger(total) && total > 0 && total <= 20 && best >= 0 && best <= total) out[k.slice(0, 80)] = { best, total };
  }
  return out;
}

/** Parse the stored list of days with learning activity, newest last. */
export function parseDays(raw: string | null): string[] {
  const days = parseStringList(raw).filter((d) => DAY_RE.test(d));
  return [...days].sort().slice(-MAX_DAYS);
}

/** Parse stored thumbs votes keyed by help question id. */
export function parseVotes(raw: string | null): Record<string, Vote> {
  const data = safeJson(raw);
  const out: Record<string, Vote> = {};
  if (typeof data !== "object" || data === null || Array.isArray(data)) return out;
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) if (v === "up" || v === "down") out[k.slice(0, 80)] = v;
  return out;
}

/** Parse the saved-a-scenario flag. */
export function parseFlag(raw: string | null): boolean {
  return raw === "1";
}

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function shiftDay(key: string, delta: number): string {
  const t = new Date(`${key}T00:00:00Z`).getTime() + delta * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Consecutive days of activity ending today. A streak that reached yesterday is still alive until the day ends. */
export function currentStreak(days: string[], today: string): number {
  const set = new Set(days);
  let cursor = set.has(today) ? today : shiftDay(today, -1);
  let n = 0;
  while (set.has(cursor)) {
    n += 1;
    cursor = shiftDay(cursor, -1);
  }
  return n;
}

/** Note a day of learning activity. */
export function recordDay(now: Date = new Date()): void {
  const days = parseDays(readRaw(KEYS.days));
  const key = dayKey(now);
  if (days.includes(key)) return;
  writeRaw(KEYS.days, JSON.stringify([...days, key].slice(-MAX_DAYS)));
}

/** Mark an article read or unread. Marking read also counts as a day of activity. */
export function setRead(slug: string, read: boolean): void {
  const list = parseStringList(readRaw(KEYS.read));
  const has = list.includes(slug);
  if (read && !has) {
    writeRaw(KEYS.read, JSON.stringify([...list, slug]));
    recordDay();
  } else if (!read && has) {
    writeRaw(KEYS.read, JSON.stringify(list.filter((s) => s !== slug)));
  }
}

/** Keep the best score for an article quiz and count the day. Returns the best score after this attempt. */
export function recordQuiz(slug: string, score: number, total: number): QuizBest {
  const all = parseQuiz(readRaw(KEYS.quiz));
  const prev = all[slug];
  const next: QuizBest = prev && prev.total === total && prev.best >= score ? prev : { best: score, total };
  writeRaw(KEYS.quiz, JSON.stringify({ ...all, [slug]: next }));
  recordDay();
  return next;
}

/** Remember that a calculator has been used. */
export function markToolUsed(slug: string): void {
  const list = parseStringList(readRaw(KEYS.tools));
  if (!list.includes(slug)) writeRaw(KEYS.tools, JSON.stringify([...list, slug]));
}

/** Remember that a scenario was saved at least once. */
export function markScenarioSaved(): void {
  if (readRaw(KEYS.saved) !== "1") writeRaw(KEYS.saved, "1");
}

/** Remember which badges have already played their unlock animation. */
export function markBadgesSeen(ids: string[]): void {
  const list = parseStringList(readRaw(KEYS.seen));
  const merged = [...list, ...ids.filter((i) => !list.includes(i))];
  if (merged.length !== list.length) writeRaw(KEYS.seen, JSON.stringify(merged));
}

/** Store or clear a thumbs vote for one help answer. */
export function setVote(id: string, vote: Vote | null): void {
  const all = parseVotes(readRaw(KEYS.votes));
  const next = { ...all };
  if (vote === null) delete next[id];
  else next[id] = vote;
  writeRaw(KEYS.votes, JSON.stringify(next));
}
