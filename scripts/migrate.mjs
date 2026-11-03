#!/usr/bin/env node
// Applies supabase/migrations/*.sql, in file name order, to the Supabase Postgres database named by SUPABASE_DB_URL.
// Each file runs inside its own transaction and is recorded in schema_migrations, so running the
// script again only applies files that are new. A failed file rolls back and stops the run.
//
// Use the direct Postgres connection string (not the transaction pooler) for migrations; the pooler can reject DDL.
// also works for plain DDL, but a direct connection is the safer choice for schema changes.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../supabase/migrations");
const url = process.env.SUPABASE_DB_URL;

if (!url) {
  process.stderr.write("SUPABASE_DB_URL is not set. Add the Supabase Postgres connection string (Project Settings, Database), then run npm run db:migrate again.\n");
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const client = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: true } });

try {
  await client.connect();
  await client.query(`create table if not exists schema_migrations (
    name text primary key,
    checksum text not null,
    applied_at timestamptz not null default now()
  )`);
  const done = new Map((await client.query("select name, checksum from schema_migrations")).rows.map((r) => [r.name, r.checksum]));
  let applied = 0;
  for (const name of files) {
    const sql = readFileSync(path.join(dir, name), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    if (done.has(name)) {
      if (done.get(name) !== checksum) process.stderr.write(`warning: ${name} changed after it was applied. Add a new migration instead of editing an old one.\n`);
      continue;
    }
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (name, checksum) values ($1, $2)", [name, checksum]);
      await client.query("commit");
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw new Error(`${name} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    applied += 1;
    process.stdout.write(`applied ${name}\n`);
  }
  process.stdout.write(applied === 0 ? "database is up to date\n" : `done, ${applied} migration${applied === 1 ? "" : "s"} applied\n`);
} catch (err) {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
