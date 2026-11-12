import { parseList, parseNum } from "@/lib/tools/common";

/** How one calculator input may appear in a shared link or a saved scenario. */
export type ParamRule =
  | { kind: "num"; min: number; max: number }
  | { kind: "pick"; options: readonly string[] }
  | { kind: "list"; min: number; max: number; maxItems: number };

export type ParamSpec = Record<string, ParamRule>;
export type Values = Record<string, string>;

const MAX_NUM_TEXT = 40;
const MAX_LIST_TEXT = 4000;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Validate one value against its rule. Anything unusable falls back, anything out of range is clamped. */
export function sanitizeValue(rule: ParamRule, raw: string | undefined | null, fallback: string): string {
  const text = (raw ?? "").trim();
  if (text === "") return fallback;
  if (rule.kind === "pick") return rule.options.includes(text) ? text : fallback;
  if (rule.kind === "num") {
    const n = parseNum(text.slice(0, MAX_NUM_TEXT));
    if (n === null) return fallback;
    const c = clamp(n, rule.min, rule.max);
    return c === n ? text.slice(0, MAX_NUM_TEXT) : String(c);
  }
  const list = parseList(text.slice(0, MAX_LIST_TEXT));
  if (list === null || list.length === 0) return fallback;
  const kept = list.slice(0, rule.maxItems).map((n) => clamp(n, rule.min, rule.max));
  const same = kept.length === list.length && kept.every((n, i) => n === list[i]);
  return same ? text.slice(0, MAX_LIST_TEXT) : kept.join(", ");
}

/** Validate a whole set of inputs. Unknown keys are dropped and missing ones take their default. */
export function sanitizeValues(spec: ParamSpec, raw: Record<string, string | undefined | null>, defaults: Values): Values {
  const out: Values = {};
  for (const key of Object.keys(defaults)) {
    const rule = spec[key];
    const base = defaults[key] ?? "";
    out[key] = rule ? sanitizeValue(rule, raw[key], base) : base;
  }
  return out;
}

/** Read a query string into plain key and value pairs. The first value of a repeated key wins. */
export function parseQuery(search: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    new URLSearchParams(search).forEach((v, k) => {
      if (!(k in out)) out[k] = v;
    });
  } catch {
    return {};
  }
  return out;
}

/** Build a query string holding only the inputs that differ from their defaults. Empty when nothing was entered. */
export function buildQuery(spec: ParamSpec, values: Values, defaults: Values): string {
  const p = new URLSearchParams();
  for (const key of Object.keys(spec)) {
    const v = (values[key] ?? "").trim();
    if (v !== "" && v !== (defaults[key] ?? "")) p.set(key, v);
  }
  return p.toString();
}

/** True when any input differs from its default. */
export function isDirty(values: Values, defaults: Values): boolean {
  return Object.keys(defaults).some((k) => (values[k] ?? "") !== (defaults[k] ?? ""));
}
