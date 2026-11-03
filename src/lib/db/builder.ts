/**
 * Small typed query builder over Postgres.
 *
 * It exposes the call surface the application uses (from/select/insert/update/upsert/delete, the filters,
 * or(), order, limit, range, single, maybeSingle) and compiles every chain into one parameterised statement.
 *
 * Safety rules:
 * - table and column identifiers must match IDENT, anything else fails the query before it is sent;
 * - every value travels as a bound parameter, nothing is interpolated into SQL text;
 * - objects and arrays are JSON-serialised and cast to jsonb;
 * - update and delete refuse to run without a filter.
 *
 * Failures never throw out of an awaited query. They come back as { data: null, error: { code, message } }
 * where code is the PostgreSQL SQLSTATE when the database reported one.
 */

export type DbRow = Record<string, unknown>;
/** Runs one parameterised statement and returns its rows. */
export type Executor = (text: string, params: unknown[]) => Promise<DbRow[]>;

export interface DbError {
  code: string;
  message: string;
}

/**
 * Rows are deliberately loosely typed, matching the untyped client this builder replaces. Routes read columns
 * by name and narrow them where it matters, so `any` is confined to this one alias.
 */
export type Loose = any;

export interface DbResult {
  data: Loose[] | null;
  error: DbError | null;
  count: number | null;
}

export interface SingleResult {
  data: Loose | null;
  error: DbError | null;
  count: number | null;
}

const IDENT = /^[a-z_][a-z0-9_]*$/;
const OPS = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=" } as const;
type CompareOp = keyof typeof OPS;
const OR_OPS = new Set<string>([...Object.keys(OPS), "like", "ilike", "is", "in"]);
const MAX_PARAMS = 60_000;

class QueryError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

function ident(name: string): string {
  if (typeof name !== "string" || name.length > 63 || !IDENT.test(name)) throw new QueryError("DB_IDENT", `Invalid identifier: ${JSON.stringify(String(name).slice(0, 40))}`);
  return `"${name}"`;
}

function nonNegInt(n: number, what: string): number {
  if (!Number.isInteger(n) || n < 0 || n > 10_000_000) throw new QueryError("DB_ARG", `Invalid ${what}`);
  return n;
}

/** Collects bound parameters and hands out their $n placeholders. */
class Params {
  readonly values: unknown[] = [];
  bind(v: unknown, kind: "plain" | "write" = "plain"): string {
    if (this.values.length >= MAX_PARAMS) throw new QueryError("DB_ARG", "Too many parameters");
    let value: unknown = v === undefined ? null : v;
    let cast = "";
    if (value instanceof Date) value = value.toISOString();
    else if (kind === "write" && value !== null && typeof value === "object") {
      value = JSON.stringify(value);
      cast = "::jsonb";
    } else if (typeof value === "bigint") value = value.toString();
    this.values.push(value);
    return `$${this.values.length}${cast}`;
  }
}

/** Splits "a.eq.1,b.in.(x,y)" on top level commas, honouring parentheses and double quotes. */
function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quoted = false;
  let cur = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (quoted) {
      cur += ch;
      if (ch === "\\" && i + 1 < input.length) cur += input[++i];
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (quoted || depth !== 0) throw new QueryError("DB_OR", "Unbalanced or() filter");
  parts.push(cur);
  return parts;
}

function unquote(raw: string): string {
  const v = raw.trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1).replace(/\\(["\\])/g, "$1");
  return v;
}

/** One "column.operator.value" entry of an or() expression, compiled with bound values. */
function compileOrPart(part: string, p: Params): string {
  const first = part.indexOf(".");
  const second = first < 0 ? -1 : part.indexOf(".", first + 1);
  if (first < 0 || second < 0) throw new QueryError("DB_OR", "Malformed or() filter");
  const col = ident(part.slice(0, first).trim());
  const op = part.slice(first + 1, second).trim();
  const rest = part.slice(second + 1);
  if (!OR_OPS.has(op)) throw new QueryError("DB_OR", "Unsupported or() operator");
  if (op === "like" || op === "ilike") return `${col}::text ${op} ${p.bind(unquote(rest))}`;
  if (op === "is") {
    const v = rest.trim().toLowerCase();
    if (v !== "null" && v !== "true" && v !== "false") throw new QueryError("DB_OR", "is() accepts null, true or false");
    return `${col} is ${v}`;
  }
  if (op === "in") {
    const v = rest.trim();
    if (!v.startsWith("(") || !v.endsWith(")")) throw new QueryError("DB_OR", "in() needs a parenthesised list");
    const items = splitTopLevel(v.slice(1, -1)).map((s) => unquote(s));
    return items.length === 0 || (items.length === 1 && items[0] === "") ? "false" : `${col}::text in (${items.map((i) => p.bind(i)).join(", ")})`;
  }
  return `${col} ${OPS[op as CompareOp]} ${p.bind(unquote(rest))}`;
}

type Mode = "select" | "insert" | "update" | "upsert" | "delete";
type Pending = (p: Params) => string;

function errorOf(e: unknown): DbError {
  if (e instanceof QueryError) return { code: e.code, message: e.message };
  const o = (e ?? {}) as { code?: unknown; message?: unknown };
  return { code: typeof o.code === "string" && o.code ? o.code : "XX000", message: typeof o.message === "string" ? o.message : "Database error" };
}

/** Dates and bigints become JSON-friendly values so results look the same on every driver. */
function normalise(row: DbRow): DbRow {
  const out: DbRow = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = v instanceof Date ? v.toISOString() : typeof v === "bigint" ? Number(v) : v;
  }
  return out;
}

export class QueryBuilder implements PromiseLike<DbResult> {
  private mode: Mode = "select";
  private columns = "*";
  private wantCount = false;
  private head = false;
  private returning: string | null = null;
  private rows: DbRow[] = [];
  private patch: DbRow = {};
  private conflict: string[] = [];
  private filters: Pending[] = [];
  private orders: Array<{ col: string; asc: boolean }> = [];
  private limitN: number | null = null;
  private offsetN = 0;
  private fault: QueryError | null = null;

  constructor(private readonly exec: Executor, private readonly table: string) {}

  private guard<T>(fn: () => T): void {
    if (this.fault) return;
    try {
      fn();
    } catch (e) {
      this.fault = e instanceof QueryError ? e : new QueryError("DB_ARG", "Invalid query");
    }
  }

  select(columns = "*", opts?: { count?: "exact"; head?: boolean }): this {
    this.guard(() => {
      const cols = this.columnList(columns);
      if (this.mode === "select") {
        this.columns = cols;
        this.wantCount = opts?.count === "exact";
        this.head = opts?.head === true;
      } else this.returning = cols;
    });
    return this;
  }

  private columnList(columns: string): string {
    const trimmed = columns.trim();
    if (trimmed === "*") return "*";
    const names = trimmed.split(",").map((c) => c.trim());
    return names.map((c) => ident(c)).join(", ");
  }

  insert(row: DbRow | DbRow[]): this {
    this.mode = "insert";
    this.rows = Array.isArray(row) ? row : [row];
    return this;
  }

  update(patch: DbRow): this {
    this.mode = "update";
    this.patch = patch;
    return this;
  }

  upsert(row: DbRow | DbRow[], opts: { onConflict: string }): this {
    this.mode = "upsert";
    this.rows = Array.isArray(row) ? row : [row];
    this.guard(() => {
      this.conflict = String(opts?.onConflict ?? "").split(",").map((c) => c.trim());
      this.conflict.forEach((c) => ident(c));
      if (this.conflict.length === 0) throw new QueryError("DB_ARG", "upsert needs onConflict");
    });
    return this;
  }

  delete(): this {
    this.mode = "delete";
    return this;
  }

  private compare(op: CompareOp, col: string, value: unknown): this {
    this.guard(() => {
      const c = ident(col);
      this.filters.push((p) => `${c} ${OPS[op]} ${p.bind(value)}`);
    });
    return this;
  }

  eq(col: string, value: unknown): this {
    return this.compare("eq", col, value);
  }
  neq(col: string, value: unknown): this {
    return this.compare("neq", col, value);
  }
  lt(col: string, value: unknown): this {
    return this.compare("lt", col, value);
  }
  lte(col: string, value: unknown): this {
    return this.compare("lte", col, value);
  }
  gt(col: string, value: unknown): this {
    return this.compare("gt", col, value);
  }
  gte(col: string, value: unknown): this {
    return this.compare("gte", col, value);
  }

  in(col: string, values: readonly unknown[]): this {
    this.guard(() => {
      const c = ident(col);
      if (!Array.isArray(values)) throw new QueryError("DB_ARG", "in() needs an array");
      this.filters.push((p) => (values.length === 0 ? "false" : `${c} in (${values.map((v) => p.bind(v)).join(", ")})`));
    });
    return this;
  }

  is(col: string, value: null | boolean): this {
    this.guard(() => {
      const c = ident(col);
      if (value !== null && typeof value !== "boolean") throw new QueryError("DB_ARG", "is() accepts null, true or false");
      this.filters.push(() => `${c} is ${value === null ? "null" : value ? "true" : "false"}`);
    });
    return this;
  }

  like(col: string, pattern: string): this {
    return this.pattern("like", col, pattern);
  }
  ilike(col: string, pattern: string): this {
    return this.pattern("ilike", col, pattern);
  }
  private pattern(op: "like" | "ilike", col: string, pattern: string): this {
    this.guard(() => {
      const c = ident(col);
      this.filters.push((p) => `${c}::text ${op} ${p.bind(String(pattern))}`);
    });
    return this;
  }

  /** PostgREST style filter list: "name.ilike.%x%,symbol.eq.ABC". Entries are OR-ed; flat entries only. */
  or(expression: string): this {
    this.guard(() => {
      const parts = splitTopLevel(String(expression)).filter((s) => s.trim() !== "");
      if (parts.length === 0) throw new QueryError("DB_OR", "Empty or() filter");
      this.filters.push((p) => `(${parts.map((part) => compileOrPart(part, p)).join(" or ")})`);
    });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.guard(() => {
      this.orders.push({ col: ident(col), asc: opts?.ascending !== false });
    });
    return this;
  }

  limit(n: number): this {
    this.guard(() => {
      this.limitN = nonNegInt(n, "limit");
    });
    return this;
  }

  range(from: number, to: number): this {
    this.guard(() => {
      nonNegInt(from, "range start");
      nonNegInt(to, "range end");
      if (to < from) throw new QueryError("DB_ARG", "Invalid range");
      this.offsetN = from;
      this.limitN = to - from + 1;
    });
    return this;
  }

  async maybeSingle(): Promise<SingleResult> {
    return this.collapse(false);
  }

  async single(): Promise<SingleResult> {
    return this.collapse(true);
  }

  private async collapse(strict: boolean): Promise<SingleResult> {
    const r = await this.run();
    if (r.error) return { data: null, error: r.error, count: r.count };
    const list = r.data ?? [];
    if (list.length === 1) return { data: list[0], error: null, count: r.count };
    if (list.length === 0 && !strict) return { data: null, error: null, count: r.count };
    return { data: null, error: { code: "PGRST116", message: list.length === 0 ? "No rows found" : "More than one row found" }, count: r.count };
  }

  then<A = DbResult, B = never>(onfulfilled?: ((v: DbResult) => A | PromiseLike<A>) | null, onrejected?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return this.run().then(onfulfilled, onrejected);
  }

  private where(p: Params): string {
    if (this.filters.length === 0) return "";
    return ` where ${this.filters.map((f) => f(p)).join(" and ")}`;
  }

  private async run(): Promise<DbResult> {
    try {
      if (this.fault) throw this.fault;
      const t = ident(this.table);
      switch (this.mode) {
        case "select":
          return await this.runSelect(t);
        case "insert":
        case "upsert":
          return await this.runWrite(this.compileInsert(t));
        case "update":
          return await this.runWrite(this.compileUpdate(t));
        case "delete":
          return await this.runWrite(this.compileDelete(t));
      }
    } catch (e) {
      return { data: null, error: errorOf(e), count: null };
    }
  }

  private async runSelect(t: string): Promise<DbResult> {
    const p = new Params();
    const where = this.where(p);
    let count: number | null = null;
    if (this.wantCount) {
      const rows = await this.exec(`select count(*)::text as n from ${t}${where}`, p.values);
      count = Number(rows[0]?.n ?? 0);
    }
    if (this.head) return { data: null, error: null, count };
    const order = this.orders.length ? ` order by ${this.orders.map((o) => `${o.col} ${o.asc ? "asc" : "desc"}`).join(", ")}` : "";
    const limit = this.limitN !== null ? ` limit ${this.limitN}` : "";
    const offset = this.offsetN > 0 ? ` offset ${this.offsetN}` : "";
    const rows = await this.exec(`select ${this.columns} from ${t}${where}${order}${limit}${offset}`, p.values);
    return { data: rows.map(normalise), error: null, count };
  }

  private async runWrite(stmt: { text: string; params: unknown[] }): Promise<DbResult> {
    const rows = await this.exec(stmt.text, stmt.params);
    return { data: this.returning ? rows.map(normalise) : null, error: null, count: null };
  }

  private returningClause(): string {
    return this.returning ? ` returning ${this.returning}` : "";
  }

  private compileInsert(t: string): { text: string; params: unknown[] } {
    const p = new Params();
    if (this.rows.length === 0) throw new QueryError("DB_ARG", "Nothing to insert");
    const keys = [...new Set(this.rows.flatMap((r) => Object.keys(r).filter((k) => r[k] !== undefined)))];
    keys.forEach((k) => ident(k));
    let text: string;
    if (keys.length === 0) text = `insert into ${t} default values`;
    else {
      const tuples = this.rows.map((r) => `(${keys.map((k) => (r[k] === undefined ? "default" : p.bind(r[k], "write"))).join(", ")})`);
      text = `insert into ${t} (${keys.map(ident).join(", ")}) values ${tuples.join(", ")}`;
    }
    if (this.mode === "upsert") {
      const conflict = this.conflict.map(ident).join(", ");
      const updatable = keys.filter((k) => !this.conflict.includes(k));
      const set = (updatable.length ? updatable : [this.conflict[0]!]).map((k) => `${ident(k)} = excluded.${ident(k)}`).join(", ");
      if (keys.length === 0 || !this.conflict.every((c) => keys.includes(c))) throw new QueryError("DB_ARG", "upsert rows must include the conflict columns");
      text += ` on conflict (${conflict}) do update set ${set}`;
    }
    return { text: text + this.returningClause(), params: p.values };
  }

  private compileUpdate(t: string): { text: string; params: unknown[] } {
    const p = new Params();
    const entries = Object.entries(this.patch).filter(([, v]) => v !== undefined);
    if (entries.length === 0) throw new QueryError("DB_ARG", "Nothing to update");
    if (this.filters.length === 0) throw new QueryError("DB_UNSAFE", "update needs a filter");
    const set = entries.map(([k, v]) => `${ident(k)} = ${p.bind(v, "write")}`).join(", ");
    return { text: `update ${t} set ${set}${this.where(p)}${this.returningClause()}`, params: p.values };
  }

  private compileDelete(t: string): { text: string; params: unknown[] } {
    const p = new Params();
    if (this.filters.length === 0) throw new QueryError("DB_UNSAFE", "delete needs a filter");
    return { text: `delete from ${t}${this.where(p)}${this.returningClause()}`, params: p.values };
  }
}

/** Query client bound to one executor. */
export class DbClient {
  constructor(private readonly exec: Executor) {}

  from(table: string): QueryBuilder {
    return new QueryBuilder(this.exec, table);
  }

  /** Raw parameterised statement for the few reads that need a join. Never interpolate values into `text`. */
  sql(text: string, params: unknown[] = []): Promise<DbRow[]> {
    return this.exec(text, params).then((rows) => rows.map(normalise));
  }
}

export function createDbClient(exec: Executor): DbClient {
  return new DbClient(exec);
}
