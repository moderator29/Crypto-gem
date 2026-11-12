import { safeJson } from "./store";
import { sanitizeValues, type ParamSpec, type Values } from "./params";

export interface Scenario { id: string; label: string; values: Values; savedAt: number }

export const MAX_SCENARIOS = 10;
export const MAX_LABEL = 40;

export type AddResult = { ok: true; list: Scenario[]; saved: Scenario } | { ok: false; error: string };

/** Storage key for one calculator's scenarios. */
export function scenarioKey(slug: string): string {
  return `cg:scn:${slug}`;
}

/** Read saved scenarios, dropping anything malformed and re-validating every value. */
export function parseScenarios(raw: string | null, spec: ParamSpec, defaults: Values): Scenario[] {
  const data = safeJson(raw);
  if (!Array.isArray(data)) return [];
  const out: Scenario[] = [];
  for (const item of data) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.label !== "string" || typeof o.savedAt !== "number" || !Number.isFinite(o.savedAt)) continue;
    if (typeof o.values !== "object" || o.values === null) continue;
    const given: Record<string, string> = {};
    for (const [k, v] of Object.entries(o.values as Record<string, unknown>)) if (typeof v === "string") given[k] = v;
    out.push({ id: o.id.slice(0, 40), label: o.label.trim().slice(0, MAX_LABEL) || "Scenario", values: sanitizeValues(spec, given, defaults), savedAt: o.savedAt });
    if (out.length >= MAX_SCENARIOS) break;
  }
  return out;
}

/** Add a scenario at the top of the list. Refuses when the tool already has the maximum. A blank label gets a numbered default. */
export function addScenario(list: Scenario[], label: string, values: Values, now: number): AddResult {
  if (list.length >= MAX_SCENARIOS) return { ok: false, error: `You can keep ${MAX_SCENARIOS} scenarios per calculator. Delete one to save another.` };
  let id = `${now.toString(36)}-${list.length}`;
  let n = 0;
  while (list.some((s) => s.id === id)) id = `${now.toString(36)}-${list.length}-${++n}`;
  const clean = label.replace(/\s+/g, " ").trim().slice(0, MAX_LABEL) || `Scenario ${list.length + 1}`;
  const saved: Scenario = { id, label: clean, values: { ...values }, savedAt: now };
  return { ok: true, list: [saved, ...list], saved };
}

/** Remove one scenario by id. */
export function removeScenario(list: Scenario[], id: string): Scenario[] {
  return list.filter((s) => s.id !== id);
}
