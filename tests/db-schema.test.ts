import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { migratedDb } from "./pg-helper";

// Identity is Privy: ids are DIDs stored as text. The database has no auth schema, no roles and no row policies.
// Access control lives in the server routes, so these tests cover the integrity rules the schema itself enforces.
const A = "did:privy:alice";
const B = "did:privy:bob";
const ADMIN = "did:privy:admin";
const SUB = "11111111-1111-1111-1111-111111111111";

let db: PGlite;

beforeAll(async () => {
  db = await migratedDb();
  await db.exec(`
    insert into public.user_roles (user_id, role) values ('${ADMIN}', 'admin');
    insert into public.token_submissions (id, owner_id, mode, network_id, address, name, symbol, status) values
      ('${SUB}', '${A}', 'express', 'solana', 'MintA', 'Alpha', 'ALP', 'published'),
      (gen_random_uuid(), '${A}', 'express', 'ethereum', '0xaaa', 'Draft', 'DRF', 'draft');
    insert into public.moderation_notes (submission_id, author, note) values ('${SUB}', '${ADMIN}', 'seeded note');
    insert into public.admin_audit_logs (actor_id, action) values ('${ADMIN}', 'seed');
  `);
});

describe("schema", () => {
  it("carries no row policies or row level security", async () => {
    expect((await db.query("select 1 from pg_policies")).rows).toHaveLength(0);
    expect((await db.query("select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity")).rows).toHaveLength(0);
  });

  it("seeds the catalog", async () => {
    const count = async (t: string) => (await db.query(`select id from public.${t}`)).rows.length;
    expect(await count("listing_packages")).toBe(3);
    expect(await count("advertising_placements")).toBe(8);
    expect(await count("boost_packs")).toBe(5);
  });

  it("seeds payment methods disabled until an administrator enables them", async () => {
    const rows = (await db.query<{ enabled: boolean }>("select enabled from public.payment_methods")).rows;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.enabled === false)).toBe(true);
  });

  it("accepts Privy DIDs as user ids", async () => {
    expect((await db.query("select 1 from public.user_roles where user_id like 'did:privy:%'")).rows.length).toBe(1);
  });
});

describe("integrity constraints", () => {
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
