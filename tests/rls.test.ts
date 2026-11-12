import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { beforeAll, describe, expect, it } from "vitest";

// Identity is Privy: ids are DIDs stored as text and arrive in the JWT "sub" claim. The auth schema is stubbed here the way Supabase provides it.
const A = "did:privy:alice";
const B = "did:privy:bob";
const ADMIN = "did:privy:admin";
const SUB = "11111111-1111-1111-1111-111111111111";

let db: PGlite;

/** Run as a client role with an optional Privy identity. The server uses the secret key and bypasses RLS. */
async function as<T = Record<string, unknown>>(role: "anon" | "authenticated", sql: string, sub: string | null = null): Promise<T[]> {
  await db.exec(`select set_config('request.jwt.claims', '${sub ? JSON.stringify({ sub }) : ""}', false); set role ${role}`);
  try {
    return (await db.query<T>(sql)).rows;
  } finally {
    await db.exec("reset role; select set_config('request.jwt.claims', '', false)");
  }
}

const migration = (f: string) => readFileSync(path.resolve(__dirname, "../supabase/migrations", f), "utf8");

beforeAll(async () => {
  db = new PGlite({ extensions: { btree_gist, pgcrypto } });
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.jwt() to anon, authenticated;
  `);
  for (const f of ["20261103000001_core_schema.sql", "20261103000002_seed_catalog.sql", "20261103000003_boost_allocations.sql", "20261103000010_admin_moderation.sql", "20261103000030_votes.sql", "20261103000040_rls_privy.sql"]) await db.exec(migration(f));
  await db.exec(`
    grant usage on schema public to anon, authenticated;
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
    grant usage, select on all sequences in schema public to anon, authenticated;
    grant execute on all functions in schema public to anon, authenticated;
    insert into public.user_roles (user_id, role) values ('${ADMIN}', 'admin');
    insert into public.watchlists (user_id, name) values ('${A}', 'mine'), ('${B}', 'theirs');
    insert into public.token_submissions (id, owner_id, mode, network_id, address, name, symbol, status) values
      ('${SUB}', '${A}', 'express', 'solana', 'MintA', 'Alpha', 'ALP', 'published'),
      (gen_random_uuid(), '${A}', 'express', 'ethereum', '0xaaa', 'Draft', 'DRF', 'draft');
    insert into public.orders (user_id, kind, ref_id, price_usd) values ('${A}', 'listing', '${SUB}', 300), ('${B}', 'boost', gen_random_uuid(), 50);
    insert into public.moderation_notes (submission_id, author, note) values ('${SUB}', '${ADMIN}', 'seeded note');
    insert into public.admin_audit_logs (actor_id, action) values ('${ADMIN}', 'seed');
  `);
});

describe("private data without a signed-in identity", () => {
  const PRIVATE = ["watchlists", "watchlist_items", "saved_searches", "price_alerts", "notifications", "profiles", "user_roles", "orders", "payments", "payment_events", "exclusive_reservations", "ad_events", "community_votes", "token_votes", "ai_conversations", "ai_messages", "platform_settings", "admin_audit_logs", "moderation_notes"];

  it("returns nothing to anonymous clients or to a token with no subject, even when rows exist", async () => {
    for (const t of PRIVATE) {
      for (const role of ["anon", "authenticated"] as const) {
        expect(await as(role, `select * from public.${t}`), `${role} read ${t}`).toHaveLength(0);
      }
    }
    expect((await db.query("select * from public.orders")).rows.length).toBeGreaterThan(0);
  });

  it("refuses client writes to private and commercial tables", async () => {
    for (const sql of [
      `insert into public.orders (user_id, kind, ref_id, price_usd) values ('${A}', 'listing', gen_random_uuid(), 0)`,
      `insert into public.user_roles (user_id, role) values ('${A}', 'super_admin')`,
      `insert into public.watchlists (user_id, name) values ('${A}', 'x')`,
      `insert into public.moderation_notes (submission_id, author, note) values ('${SUB}', '${A}', 'x')`,
      `insert into public.admin_audit_logs (actor_id, action) values ('${A}', 'forged')`,
      `insert into public.token_submissions (owner_id, mode, name, symbol, status) values ('${A}', 'standard', 'X', 'X', 'published')`,
    ]) {
      await expect(as("authenticated", sql), sql).rejects.toThrow();
    }
  });

  it("ignores client updates and deletes silently, leaving data untouched", async () => {
    await as("authenticated", "update public.orders set price_usd = 1");
    await as("authenticated", "delete from public.moderation_notes");
    expect((await db.query<{ price_usd: string }>("select price_usd from public.orders")).rows[0]?.price_usd).toBe("300");
    expect((await db.query("select 1 from public.moderation_notes")).rows).toHaveLength(1);
  });
});

describe("per-user isolation with a Privy identity", () => {
  it("lets a user read and write only their own watchlist", async () => {
    expect((await as<{ name: string }>("authenticated", "select name from public.watchlists", A)).map((r) => r.name)).toEqual(["mine"]);
    expect((await as<{ name: string }>("authenticated", "select name from public.watchlists", B)).map((r) => r.name)).toEqual(["theirs"]);
    const theirs = (await db.query<{ id: string }>(`select id from public.watchlists where user_id = '${B}'`)).rows[0]!.id;
    await expect(as("authenticated", `insert into public.watchlist_items (watchlist_id, network_id, address) values ('${theirs}', 'eth', '0x1')`, A)).rejects.toThrow();
    await as("authenticated", `insert into public.watchlists (user_id, name) values ('${A}', 'second')`, A);
    await expect(as("authenticated", `insert into public.watchlists (user_id, name) values ('${B}', 'forged')`, A)).rejects.toThrow();
  });
  it("shows a user only their own orders and never lets them write one", async () => {
    expect((await as<{ kind: string }>("authenticated", "select kind from public.orders", A)).map((r) => r.kind)).toEqual(["listing"]);
    expect((await as<{ kind: string }>("authenticated", "select kind from public.orders", B)).map((r) => r.kind)).toEqual(["boost"]);
    await expect(as("authenticated", `insert into public.orders (user_id, kind, ref_id, price_usd) values ('${A}', 'listing', gen_random_uuid(), 0)`, A)).rejects.toThrow();
  });
  it("lets owners create drafts but never publish or verify themselves", async () => {
    await as("authenticated", `insert into public.token_submissions (owner_id, mode, name, symbol) values ('${B}', 'standard', 'Mine', 'MNE')`, B);
    await expect(as("authenticated", `insert into public.token_submissions (owner_id, mode, name, symbol, status) values ('${B}', 'standard', 'X', 'X', 'published')`, B)).rejects.toThrow();
    await expect(as("authenticated", `insert into public.token_submissions (owner_id, mode, name, symbol, verification) values ('${B}', 'standard', 'X', 'X', 'links_verified')`, B)).rejects.toThrow();
    await expect(as("authenticated", `insert into public.token_submissions (owner_id, mode, name, symbol) values ('${A}', 'standard', 'Impersonated', 'IMP')`, B)).rejects.toThrow();
  });
  it("limits role reads and blocks self-promotion", async () => {
    expect(await as("authenticated", "select * from public.user_roles", A)).toHaveLength(0);
    expect((await as("authenticated", "select * from public.user_roles", ADMIN)).length).toBeGreaterThan(0);
    await expect(as("authenticated", `insert into public.user_roles (user_id, role) values ('${A}', 'super_admin')`, A)).rejects.toThrow();
  });
  it("gives staff their access and nobody else", async () => {
    expect((await as("authenticated", "select * from public.admin_audit_logs", ADMIN)).length).toBeGreaterThan(0);
    expect(await as("authenticated", "select * from public.admin_audit_logs", A)).toHaveLength(0);
    expect((await as("authenticated", "select * from public.moderation_notes", ADMIN)).length).toBeGreaterThan(0);
    expect(await as("authenticated", "select * from public.moderation_notes", A)).toHaveLength(0);
    await as("authenticated", "update public.listing_packages set price_usd = 1", A);
    await as("authenticated", "update public.listing_packages set price_usd = 350 where id = 'starter'", ADMIN);
    expect((await db.query<{ price_usd: string }>("select price_usd from public.listing_packages where id = 'starter'")).rows[0]?.price_usd).toBe("350");
  });
});

describe("public catalog reads", () => {
  it("shows anonymous visitors only published submissions", async () => {
    expect((await as<{ name: string }>("anon", "select name from public.token_submissions")).map((r) => r.name)).toEqual(["Alpha"]);
  });
  it("exposes the active catalog but hides payment methods until an administrator enables them", async () => {
    expect((await as("anon", "select id from public.listing_packages")).length).toBe(3);
    expect((await as("anon", "select id from public.advertising_placements")).length).toBe(8);
    expect((await as("anon", "select id from public.boost_packs")).length).toBe(5);
    expect((await as("anon", "select id from public.payment_methods")).length).toBe(0);
  });
  it("does not let clients change prices", async () => {
    const before = (await db.query<{ price_usd: string }>("select price_usd from public.listing_packages where id = 'pro'")).rows[0]?.price_usd;
    await as("authenticated", "update public.listing_packages set price_usd = 1 where id = 'pro'");
    await as("anon", "update public.listing_packages set price_usd = 1 where id = 'pro'");
    expect((await db.query<{ price_usd: string }>("select price_usd from public.listing_packages where id = 'pro'")).rows[0]?.price_usd).toBe(before);
  });
});

describe("integrity constraints", () => {
  it("accepts Privy DIDs as user ids", async () => {
    expect((await db.query("select 1 from public.user_roles where user_id like 'did:privy:%'")).rows.length).toBe(1);
  });
  it("prevents a second live submission of the same contract", async () => {
    await expect(db.exec(`insert into public.token_submissions (owner_id, mode, network_id, address, name, symbol) values ('${B}', 'express', 'solana', 'MintA', 'Dup', 'DUP')`)).rejects.toThrow();
  });
  it("rejects overlapping exclusive reservations for the same slot, allows adjacent ones", async () => {
    await db.exec(`
      insert into public.advertising_campaigns (id, owner_id, placement_id, destination_url, starts_at, ends_at) values
        ('11111111-1111-1111-1111-1111111111a1', '${A}', 'trending', 'https://a.example', '2026-12-01', '2026-12-04'),
        ('22222222-2222-2222-2222-2222222222a2', '${B}', 'trending', 'https://b.example', '2026-12-03', '2026-12-06'),
        ('33333333-3333-3333-3333-3333333333a3', '${B}', 'trending', 'https://b.example', '2026-12-04', '2026-12-07');
      insert into public.exclusive_reservations (campaign_id, placement_id, slot, during) values ('11111111-1111-1111-1111-1111111111a1', 'trending', 1, tstzrange('2026-12-01', '2026-12-04'));
    `);
    await expect(db.exec(`insert into public.exclusive_reservations (campaign_id, placement_id, slot, during) values ('22222222-2222-2222-2222-2222222222a2', 'trending', 1, tstzrange('2026-12-03', '2026-12-06'))`)).rejects.toThrow();
    await db.exec(`insert into public.exclusive_reservations (campaign_id, placement_id, slot, during) values ('33333333-3333-3333-3333-3333333333a3', 'trending', 1, tstzrange('2026-12-04', '2026-12-07'))`);
  });
  it("lets one project queue boosts back to back but never overlap", async () => {
    const ins = (pack: string, a: string, b: string) => db.exec(`insert into public.boost_campaigns (owner_id, submission_id, pack_id, status, starts_at, ends_at) values ('${A}', '${SUB}', '${pack}', 'active', '${a}', '${b}')`);
    await ins("spark", "2026-12-01T00:00Z", "2026-12-01T06:00Z");
    await ins("spark", "2026-12-01T06:00Z", "2026-12-01T12:00Z");
    await expect(ins("ignite", "2026-12-01T05:00Z", "2026-12-01T17:00Z")).rejects.toThrow();
  });
  it("dedupes ad events and webhook deliveries", async () => {
    await db.exec(`insert into public.ad_events (campaign_id, kind, dedupe_key) values ('11111111-1111-1111-1111-1111111111a1', 'impression', 'k1')`);
    await expect(db.exec(`insert into public.ad_events (campaign_id, kind, dedupe_key) values ('11111111-1111-1111-1111-1111111111a1', 'impression', 'k1')`)).rejects.toThrow();
    await db.exec(`insert into public.payment_events (provider_payment_id, status, payload, fingerprint) values ('555', 'finished', '{}', 'fp1')`);
    await expect(db.exec(`insert into public.payment_events (provider_payment_id, status, payload, fingerprint) values ('555', 'finished', '{}', 'fp1')`)).rejects.toThrow();
  });
  it("refuses non-https campaign destinations", async () => {
    await expect(db.exec(`insert into public.advertising_campaigns (owner_id, placement_id, destination_url, starts_at, ends_at) values ('${A}', 'trending', 'javascript:alert(1)', now(), now() + interval '1 day')`)).rejects.toThrow();
  });
  it("keeps the audit trail append-only and validates moderation notes", async () => {
    await expect(db.exec("update public.admin_audit_logs set action = 'tampered'")).rejects.toThrow(/append-only/);
    await expect(db.exec("delete from public.admin_audit_logs")).rejects.toThrow(/append-only/);
    await expect(db.exec(`insert into public.moderation_notes (submission_id, author, note) values ('${SUB}', '${ADMIN}', '')`)).rejects.toThrow();
    await expect(db.exec(`insert into public.moderation_notes (submission_id, author, note, kind) values ('${SUB}', '${ADMIN}', 'x', 'bogus')`)).rejects.toThrow();
  });
});
