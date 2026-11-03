import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { beforeAll, describe, expect, it } from "vitest";

const OWNER = "00000000-0000-0000-0000-00000000000a";
const NOBODY = "00000000-0000-0000-0000-00000000000b";
const REVIEWER = "00000000-0000-0000-0000-0000000000c1";
const SUPPORT = "00000000-0000-0000-0000-0000000000c2";
const ADMIN = "00000000-0000-0000-0000-0000000000ad";
const SUB = "11111111-1111-1111-1111-111111111111";

let db: PGlite;

async function as<T = Record<string, unknown>>(role: "anon" | "authenticated", uid: string | null, sql: string): Promise<T[]> {
  await db.exec(`set role ${role}; select set_config('request.jwt.sub', '${uid ?? ""}', false);`);
  try {
    return (await db.query<T>(sql)).rows;
  } finally {
    await db.exec("reset role");
  }
}

const migration = (f: string) => readFileSync(path.resolve(__dirname, "../supabase/migrations", f), "utf8");

beforeAll(async () => {
  db = new PGlite({ extensions: { btree_gist, pgcrypto } });
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
    create role anon; create role authenticated;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  await db.exec(migration("20261103000001_core_schema.sql"));
  await db.exec(migration("20261103000002_seed_catalog.sql"));
  await db.exec(migration("20261103000010_admin_moderation.sql"));
  await db.exec(`
    grant usage on schema public to anon, authenticated;
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
    grant usage, select on all sequences in schema public to anon, authenticated;
    grant execute on all functions in schema public to anon, authenticated;
    insert into auth.users values ('${OWNER}'), ('${NOBODY}'), ('${REVIEWER}'), ('${SUPPORT}'), ('${ADMIN}');
    insert into public.user_roles (user_id, role) values ('${REVIEWER}', 'listing_reviewer'), ('${SUPPORT}', 'support_agent'), ('${ADMIN}', 'admin');
    insert into public.token_submissions (id, owner_id, mode, network_id, address, name, symbol, status) values ('${SUB}', '${OWNER}', 'express', 'solana', 'MintA', 'Alpha', 'ALP', 'pending_review');
    insert into public.moderation_notes (submission_id, author, note) values ('${SUB}', '${REVIEWER}', 'seeded note');
  `);
});

describe("moderation_notes access", () => {
  it("hides notes from anonymous visitors, owners and signed-in non-staff", async () => {
    expect(await as("anon", null, "select * from public.moderation_notes")).toHaveLength(0);
    expect(await as("authenticated", OWNER, "select * from public.moderation_notes")).toHaveLength(0);
    expect(await as("authenticated", NOBODY, "select * from public.moderation_notes")).toHaveLength(0);
  });

  it("refuses writes from non-staff, including the submission owner", async () => {
    for (const uid of [OWNER, NOBODY]) {
      await expect(as("authenticated", uid, `insert into public.moderation_notes (submission_id, author, note) values ('${SUB}', '${uid}', 'hello')`)).rejects.toThrow();
    }
    await expect(as("anon", null, `insert into public.moderation_notes (submission_id, author, note) values ('${SUB}', '${OWNER}', 'hello')`)).rejects.toThrow();
  });

  it("lets staff read, but only a reviewer write, and only as themselves", async () => {
    expect((await as("authenticated", SUPPORT, "select * from public.moderation_notes")).length).toBe(1);
    expect((await as("authenticated", ADMIN, "select * from public.moderation_notes")).length).toBe(1);
    await expect(as("authenticated", SUPPORT, `insert into public.moderation_notes (submission_id, author, note) values ('${SUB}', '${SUPPORT}', 'x')`)).rejects.toThrow();
    await expect(as("authenticated", REVIEWER, `insert into public.moderation_notes (submission_id, author, note) values ('${SUB}', '${ADMIN}', 'forged author')`)).rejects.toThrow();
    await as("authenticated", REVIEWER, `insert into public.moderation_notes (submission_id, author, note, kind) values ('${SUB}', '${REVIEWER}', 'checked links', 'approve')`);
    expect((await db.query("select 1 from public.moderation_notes")).rows).toHaveLength(2);
  });

  it("makes notes immutable for clients and validates content", async () => {
    await as("authenticated", REVIEWER, "update public.moderation_notes set note = 'edited'");
    await as("authenticated", REVIEWER, "delete from public.moderation_notes");
    expect((await db.query<{ note: string }>("select note from public.moderation_notes where note = 'seeded note'")).rows).toHaveLength(1);
    await expect(db.exec(`insert into public.moderation_notes (submission_id, author, note) values ('${SUB}', '${REVIEWER}', '')`)).rejects.toThrow();
    await expect(db.exec(`insert into public.moderation_notes (submission_id, author, note, kind) values ('${SUB}', '${REVIEWER}', 'x', 'bogus')`)).rejects.toThrow();
  });
});

describe("audit log integrity", () => {
  it("keeps the audit trail append-only", async () => {
    await db.exec(`insert into public.admin_audit_logs (actor_id, action, target) values ('${ADMIN}', 'test.write', 'x')`);
    await expect(db.exec("update public.admin_audit_logs set action = 'tampered'")).rejects.toThrow(/append-only/);
    await expect(db.exec("delete from public.admin_audit_logs")).rejects.toThrow(/append-only/);
  });

  it("lets only admins read it and nobody write it from a client", async () => {
    expect((await as("authenticated", ADMIN, "select * from public.admin_audit_logs")).length).toBeGreaterThan(0);
    expect(await as("authenticated", REVIEWER, "select * from public.admin_audit_logs")).toHaveLength(0);
    expect(await as("authenticated", NOBODY, "select * from public.admin_audit_logs")).toHaveLength(0);
    await expect(as("authenticated", ADMIN, `insert into public.admin_audit_logs (actor_id, action) values ('${ADMIN}', 'forged')`)).rejects.toThrow();
  });
});
