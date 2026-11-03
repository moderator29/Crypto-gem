import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { beforeAll, describe, expect, it } from "vitest";

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const ADMIN = "00000000-0000-0000-0000-0000000000ad";

let db: PGlite;

/** Run a statement as a Supabase-style role with a given JWT subject. */
async function as<T = Record<string, unknown>>(role: "anon" | "authenticated" | "postgres", uid: string | null, sql: string): Promise<T[]> {
  await db.exec(`set role ${role}; select set_config('request.jwt.sub', '${uid ?? ""}', false);`);
  try {
    return (await db.query<T>(sql)).rows;
  } finally {
    await db.exec("reset role");
  }
}

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
  await db.exec(readFileSync(path.resolve(__dirname, "../supabase/migrations/20261103000001_core_schema.sql"), "utf8"));
  await db.exec(readFileSync(path.resolve(__dirname, "../supabase/migrations/20261103000002_seed_catalog.sql"), "utf8"));
  await db.exec(`
    grant usage on schema public to anon, authenticated;
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
    grant usage, select on all sequences in schema public to anon, authenticated;
    grant execute on all functions in schema public to anon, authenticated;
    insert into auth.users values ('${A}'), ('${B}'), ('${ADMIN}');
    insert into public.user_roles (user_id, role) values ('${ADMIN}', 'admin');
    insert into public.watchlists (user_id, name) values ('${A}', 'mine'), ('${B}', 'theirs');
    insert into public.token_submissions (owner_id, mode, network_id, address, name, symbol, status) values
      ('${A}', 'express', 'solana', 'MintA', 'Alpha', 'ALP', 'published'),
      ('${A}', 'express', 'ethereum', '0xaaa', 'Draft', 'DRF', 'draft');
  `);
});

describe("row level security", () => {
  it("lets users see only their own watchlists", async () => {
    const rows = await as<{ name: string }>("authenticated", A, "select name from public.watchlists");
    expect(rows.map((r) => r.name)).toEqual(["mine"]);
  });

  it("blocks writing into someone else's watchlist", async () => {
    const theirs = (await db.query<{ id: string }>(`select id from public.watchlists where user_id = '${B}'`)).rows[0]!.id;
    await expect(as("authenticated", A, `insert into public.watchlist_items (watchlist_id, network_id, address) values ('${theirs}', 'eth', '0x1')`)).rejects.toThrow();
  });

  it("shows anonymous visitors only published submissions", async () => {
    const rows = await as<{ name: string }>("anon", null, "select name from public.token_submissions");
    expect(rows.map((r) => r.name)).toEqual(["Alpha"]);
  });

  it("stops owners from self-publishing or self-verifying", async () => {
    await expect(
      as("authenticated", B, `insert into public.token_submissions (owner_id, mode, name, symbol, status) values ('${B}', 'standard', 'X', 'X', 'published')`),
    ).rejects.toThrow();
    await expect(
      as("authenticated", B, `insert into public.token_submissions (owner_id, mode, name, symbol, verification) values ('${B}', 'standard', 'X', 'X', 'links_verified')`),
    ).rejects.toThrow();
  });

  it("prevents a second live submission of the same contract", async () => {
    await expect(
      db.exec(`insert into public.token_submissions (owner_id, mode, network_id, address, name, symbol) values ('${B}', 'express', 'solana', 'MintA', 'Dup', 'DUP')`),
    ).rejects.toThrow();
  });

  it("ships the catalog with every payment method disabled until verified", async () => {
    expect((await db.query("select 1 from public.payment_methods where enabled")).rows).toHaveLength(0);
    expect((await as("anon", null, "select id from public.payment_methods")).length).toBe(0);
    expect((await as("anon", null, "select id from public.listing_packages")).length).toBe(3);
  });

  it("denies ordinary users any write to payments or orders", async () => {
    await expect(as("authenticated", A, `insert into public.orders (user_id, kind, ref_id, price_usd) values ('${A}', 'listing', gen_random_uuid(), 0)`)).rejects.toThrow();
  });

  it("limits role reads to self and admins, and blocks self-promotion", async () => {
    expect(await as("authenticated", A, "select * from public.user_roles")).toHaveLength(0);
    expect((await as("authenticated", ADMIN, "select * from public.user_roles")).length).toBeGreaterThan(0);
    await expect(as("authenticated", A, `insert into public.user_roles (user_id, role) values ('${A}', 'admin')`)).rejects.toThrow();
  });

  it("only lets admins change prices", async () => {
        await as("authenticated", A, "update public.listing_packages set price_usd = 1 where id = 'starter'");
    expect((await db.query<{ price_usd: string }>("select price_usd from public.listing_packages where id = 'starter'")).rows[0]?.price_usd).toBe("300");
    await as("authenticated", ADMIN, "update public.listing_packages set price_usd = 350 where id = 'starter'");
    expect((await db.query<{ price_usd: string }>("select price_usd from public.listing_packages where id = 'starter'")).rows[0]?.price_usd).toBe("350");
  });
});

describe("advertising integrity", () => {
  it("rejects overlapping exclusive reservations for the same slot, allows adjacent ones", async () => {
    await db.exec(`
      insert into public.advertising_campaigns (id, owner_id, placement_id, destination_url, starts_at, ends_at) values
        ('11111111-1111-1111-1111-111111111111', '${A}', 'trending', 'https://a.example', '2026-12-01', '2026-12-04'),
        ('22222222-2222-2222-2222-222222222222', '${B}', 'trending', 'https://b.example', '2026-12-03', '2026-12-06'),
        ('33333333-3333-3333-3333-333333333333', '${B}', 'trending', 'https://b.example', '2026-12-04', '2026-12-07');
      insert into public.exclusive_reservations (campaign_id, placement_id, slot, during) values ('11111111-1111-1111-1111-111111111111', 'trending', 1, tstzrange('2026-12-01', '2026-12-04'));
    `);
    await expect(
      db.exec(`insert into public.exclusive_reservations (campaign_id, placement_id, slot, during) values ('22222222-2222-2222-2222-222222222222', 'trending', 1, tstzrange('2026-12-03', '2026-12-06'))`),
    ).rejects.toThrow();
    await db.exec(`insert into public.exclusive_reservations (campaign_id, placement_id, slot, during) values ('33333333-3333-3333-3333-333333333333', 'trending', 1, tstzrange('2026-12-04', '2026-12-07'))`);
  });

  it("ignores duplicate impressions with the same dedupe key", async () => {
    await db.exec(`insert into public.ad_events (campaign_id, kind, dedupe_key) values ('11111111-1111-1111-1111-111111111111', 'impression', 'v1:2026-12-01T10')`);
    await expect(db.exec(`insert into public.ad_events (campaign_id, kind, dedupe_key) values ('11111111-1111-1111-1111-111111111111', 'impression', 'v1:2026-12-01T10')`)).rejects.toThrow();
  });

  it("refuses non-https campaign destinations", async () => {
    await expect(
      db.exec(`insert into public.advertising_campaigns (owner_id, placement_id, destination_url, starts_at, ends_at) values ('${A}', 'trending', 'javascript:alert(1)', now(), now() + interval '1 day')`),
    ).rejects.toThrow();
  });

  it("makes a payment webhook idempotent through its fingerprint", async () => {
    await db.exec(`insert into public.payment_events (provider_payment_id, status, payload, fingerprint) values ('555', 'finished', '{}', 'fp1')`);
    await expect(db.exec(`insert into public.payment_events (provider_payment_id, status, payload, fingerprint) values ('555', 'finished', '{}', 'fp1')`)).rejects.toThrow();
  });
});
