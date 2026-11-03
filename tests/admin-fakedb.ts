export type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;

/** In-memory stand-in for the parts of the query builder the admin routes use. */
export function createFakeDb(tables: Tables, failures: Set<string> = new Set()) {
  const from = (name: string) => {
    const preds: Array<(r: Row) => boolean> = [];
    let op: "select" | "insert" | "update" = "select";
    let patch: Row = {};
    let inserted: Row[] = [];
    let head = false;
    let wantCount = false;
    let limitN = Infinity;
    let rangeFrom = 0;
    let orderBy: { col: string; asc: boolean } | null = null;

    const matched = () => (tables[name] ?? []).filter((r) => preds.every((p) => p(r)));
    const run = () => {
      if (failures.has(`${name}.${op}`)) return { data: null, error: { code: "XX000", message: "forced failure" }, count: null };
      if (op === "insert") {
        const t = (tables[name] ??= []);
        t.push(...inserted);
        return { data: inserted, error: null, count: null };
      }
      if (op === "update") {
        const hit = matched();
        hit.forEach((r) => Object.assign(r, patch));
        return { data: hit.map((r) => ({ ...r })), error: null, count: null };
      }
      let rows = matched().map((r) => ({ ...r }));
      if (orderBy) {
        const { col, asc } = orderBy;
        rows = rows.sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1) * (asc ? 1 : -1));
      }
      const total = rows.length;
      rows = rows.slice(rangeFrom, rangeFrom + limitN);
      return { data: head ? null : rows, error: null, count: wantCount ? total : null };
    };

    const q = {
      select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
        if (opts?.count) wantCount = true;
        if (opts?.head) head = true;
        return q;
      },
      insert: (row: Row | Row[]) => {
        op = "insert";
        inserted = (Array.isArray(row) ? row : [row]).map((r) => ({ ...r }));
        return q;
      },
      update: (p: Row) => {
        op = "update";
        patch = p;
        return q;
      },
      eq: (k: string, v: unknown) => (preds.push((r) => r[k] === v), q),
      in: (k: string, v: unknown[]) => (preds.push((r) => v.includes(r[k])), q),
      lte: (k: string, v: string) => (preds.push((r) => String(r[k]) <= v), q),
      gte: (k: string, v: string) => (preds.push((r) => String(r[k]) >= v), q),
      order: (col: string, o?: { ascending?: boolean }) => ((orderBy = { col, asc: o?.ascending !== false }), q),
      limit: (n: number) => ((limitN = n), q),
      range: (a: number, b: number) => ((rangeFrom = a), (limitN = b - a + 1), q),
      maybeSingle: async () => {
        const r = run();
        return { ...r, data: Array.isArray(r.data) ? (r.data[0] ?? null) : null };
      },
      then: (resolve: (v: unknown) => void) => resolve(run()),
    };
    return q;
  };
  return { from, sql: async () => [] as Row[] };
}
