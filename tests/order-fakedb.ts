export type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;

/** In-memory Supabase stand-in with generated ids, single(), in() and update-returning-rows for the order and payment routes. */
export function createOrderDb(tables: Tables) {
  const from = (name: string) => {
    const preds: Array<(r: Row) => boolean> = [];
    let op: "select" | "insert" | "update" = "select";
    let patch: Row = {};
    let inserted: Row[] = [];
    const rows = () => (tables[name] ??= []).filter((r) => preds.every((p) => p(r)));
    const run = () => {
      if (op === "insert") {
        inserted = inserted.map((r) => ({ id: uuid(), ...r }));
        (tables[name] ??= []).push(...inserted);
        return { data: inserted, error: null };
      }
      const hit = rows();
      if (op === "update") hit.forEach((r) => Object.assign(r, patch));
      return { data: hit.map((r) => ({ ...r })), error: null };
    };
    const q = {
      select: () => q,
      insert: (r: Row | Row[]) => ((op = "insert"), (inserted = (Array.isArray(r) ? r : [r]).map((x) => ({ ...x }))), q),
      update: (p: Row) => ((op = "update"), (patch = p), q),
      eq: (k: string, v: unknown) => (preds.push((r) => r[k] === v), q),
      neq: (k: string, v: unknown) => (preds.push((r) => r[k] !== v), q),
      in: (k: string, v: unknown[]) => (preds.push((r) => v.includes(r[k])), q),
      gte: (k: string, v: string) => (preds.push((r) => String(r[k]) >= v), q),
      order: () => q,
      limit: () => q,
      maybeSingle: async () => {
        const r = run();
        return { ...r, data: r.data[0] ?? null };
      },
      single: async () => {
        const r = run();
        return r.data[0] ? { ...r, data: r.data[0] } : { data: null, error: { code: "PGRST116" } };
      },
      then: (resolve: (v: unknown) => void) => resolve(run()),
    };
    return q;
  };
  return { from };
}
