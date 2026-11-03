import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import type { DbRow, Executor } from "@/lib/db/builder";

const NUMERIC = 1700;
const INT8 = 20;

export const MIGRATIONS_DIR = path.resolve(__dirname, "../db/migrations");

/** An in-process Postgres with every real migration applied, in file order. */
export async function migratedDb(): Promise<PGlite> {
  const db = new PGlite({ extensions: { btree_gist, pgcrypto }, parsers: { [NUMERIC]: (v: string) => Number(v), [INT8]: (v: string) => Number(v) } });
  for (const f of readdirSync(MIGRATIONS_DIR).filter((n) => n.endsWith(".sql")).sort()) await db.exec(readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"));
  return db;
}

/** Executor the query builder runs against in tests. */
export function executorFor(db: PGlite): Executor {
  return async (text, params) => (await db.query<DbRow>(text, params)).rows;
}
