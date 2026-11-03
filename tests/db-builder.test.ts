import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDbClient, type DbClient } from "@/lib/db/builder";
import { executorFor, migratedDb } from "./pg-helper";

const A = "did:privy:alice";
const B = "did:privy:bob";

let pg: PGlite;
let db: DbClient;

const submission = (over: Record<string, unknown>) => ({ owner_id: A, mode: "express", network_id: "solana", name: "N", symbol: "S", status: "published", ...over });

beforeAll(async () => {
  pg = await migratedDb();
  db = createDbClient(executorFor(pg));
});

beforeEach(async () => {
  await pg.exec("truncate public.token_submissions, public.orders, public.watchlists, public.saved_searches cascade");
});

async function seedSubmissions() {
  const { error } = await db.from("token_submissions").insert([
    submission({ address: "a1", name: "Alpha Coin", symbol: "ALP", updated_at: "2026-01-01T00:00:00Z" }),
    submission({ address: "a2", name: "Beta Token", symbol: "BET", status: "draft", updated_at: "2026-01-02T00:00:00Z" }),
    submission({ address: "a3", name: "Gamma", symbol: "GAM", owner_id: B, updated_at: "2026-01-03T00:00:00Z" }),
    submission({ address: "a4", name: "Delta Alpha", symbol: "DEL", owner_id: B, status: "rejected", updated_at: "2026-01-04T00:00:00Z" }),
  ]);
  expect(error).toBeNull();
}

describe("select", () => {
  beforeEach(seedSubmissions);

  it("reads columns with eq, neq and in filters", async () => {
    const r = await db.from("token_submissions").select("name,symbol").eq("owner_id", A).order("name");
    expect(r.error).toBeNull();
    expect(r.data).toEqual([{ name: "Alpha Coin", symbol: "ALP" }, { name: "Beta Token", symbol: "BET" }]);
    expect((await db.from("token_submissions").select("symbol").neq("status", "published").order("symbol")).data).toEqual([{ symbol: "BET" }, { symbol: "DEL" }]);
    expect((await db.from("token_submissions").select("symbol").in("status", ["published", "rejected"]).order("symbol")).data).toHaveLength(3);
    expect((await db.from("token_submissions").select("symbol").in("status", [])).data).toEqual([]);
  });

  it("defaults to every column", async () => {
    const r = await db.from("token_submissions").select().eq("address", "a1").maybeSingle();
    expect(r.data).toMatchObject({ name: "Alpha Coin", owner_id: A });
  });

  it("compares with lt, lte, gt, gte and is", async () => {
    const col = "updated_at";
    expect((await db.from("token_submissions").select("symbol").gte(col, "2026-01-03T00:00:00Z").order(col)).data).toEqual([{ symbol: "GAM" }, { symbol: "DEL" }]);
    expect((await db.from("token_submissions").select("symbol").gt(col, "2026-01-03T00:00:00Z")).data).toEqual([{ symbol: "DEL" }]);
    expect((await db.from("token_submissions").select("symbol").lt(col, "2026-01-02T00:00:00Z")).data).toEqual([{ symbol: "ALP" }]);
    expect((await db.from("token_submissions").select("symbol").lte(col, "2026-01-02T00:00:00Z").order(col)).data).toEqual([{ symbol: "ALP" }, { symbol: "BET" }]);
    expect((await db.from("token_submissions").select("symbol").is("rejection_reason", null)).data).toHaveLength(4);
  });

  it("searches with like and ilike", async () => {
    expect((await db.from("token_submissions").select("symbol").ilike("name", "%alpha%").order("symbol")).data).toEqual([{ symbol: "ALP" }, { symbol: "DEL" }]);
    expect((await db.from("token_submissions").select("symbol").like("name", "alpha%")).data).toEqual([]);
  });

  it("parses or() with several operators", async () => {
    const r = await db.from("token_submissions").select("symbol").or("name.ilike.%alpha%,symbol.eq.GAM,status.in.(draft)").order("symbol");
    expect(r.error).toBeNull();
    expect(r.data).toEqual([{ symbol: "ALP" }, { symbol: "BET" }, { symbol: "DEL" }, { symbol: "GAM" }]);
    const quoted = await db.from("token_submissions").select("symbol").or('name.eq."Gamma",symbol.is.null');
    expect(quoted.data).toEqual([{ symbol: "GAM" }]);
  });

  it("orders, limits and ranges", async () => {
    expect((await db.from("token_submissions").select("symbol").order("updated_at", { ascending: false }).limit(2)).data).toEqual([{ symbol: "DEL" }, { symbol: "GAM" }]);
    expect((await db.from("token_submissions").select("symbol").order("updated_at").range(1, 2)).data).toEqual([{ symbol: "BET" }, { symbol: "GAM" }]);
    expect((await db.from("token_submissions").select("symbol").order("updated_at").limit(0)).data).toEqual([]);
  });

  it("returns exact counts, with or without rows", async () => {
    const withRows = await db.from("token_submissions").select("symbol", { count: "exact" }).eq("owner_id", A).range(0, 0);
    expect(withRows.count).toBe(2);
    expect(withRows.data).toHaveLength(1);
    const head = await db.from("token_submissions").select("*", { count: "exact", head: true }).eq("status", "published");
    expect(head.count).toBe(2);
    expect(head.data).toBeNull();
    expect((await db.from("token_submissions").select("id", { count: "exact", head: true }).eq("name", "nobody")).count).toBe(0);
  });

  it("returns timestamps as ISO strings and numerics as numbers", async () => {
    const { data: s } = await db.from("token_submissions").select("id,updated_at").eq("address", "a1").single();
    expect(s.updated_at).toBe("2026-01-01T00:00:00.000Z");
    await db.from("orders").insert({ user_id: A, kind: "listing", ref_id: s.id, price_usd: 300.5 });
    expect((await db.from("orders").select("price_usd").single()).data).toEqual({ price_usd: 300.5 });
  });
});

describe("single and maybeSingle", () => {
  beforeEach(seedSubmissions);

  it("maybeSingle returns null for no row and errors for several", async () => {
    expect((await db.from("token_submissions").select("id").eq("address", "none").maybeSingle())).toEqual({ data: null, error: null, count: null });
    const many = await db.from("token_submissions").select("id").eq("status", "published").maybeSingle();
    expect(many.data).toBeNull();
    expect(many.error?.code).toBe("PGRST116");
  });

  it("single errors for no row and for several, returns the row otherwise", async () => {
    expect((await db.from("token_submissions").select("id").eq("address", "none").single()).error?.code).toBe("PGRST116");
    expect((await db.from("token_submissions").select("id").eq("status", "published").single()).error?.code).toBe("PGRST116");
    expect((await db.from("token_submissions").select("symbol").eq("address", "a1").single()).data).toEqual({ symbol: "ALP" });
  });
});

describe("writes", () => {
  it("insert returns nothing unless select is chained, then returns the new rows", async () => {
    const plain = await db.from("watchlists").insert({ user_id: A, name: "one" });
    expect(plain).toEqual({ data: null, error: null, count: null });
    const returned = await db.from("watchlists").insert([{ user_id: A, name: "two" }, { user_id: B, name: "three" }]).select("id,name");
    expect(returned.data!.map((r: { name: string }) => r.name)).toEqual(["two", "three"]);
    expect(returned.data![0].id).toMatch(/^[0-9a-f-]{36}$/);
    const one = await db.from("watchlists").insert({ user_id: A, name: "four" }).select("id").single();
    expect(one.data.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("insert with rows of different keys fills the rest with defaults", async () => {
    const r = await db.from("token_submissions").insert([submission({ address: "x1", status: undefined }), submission({ address: "x2", status: "published" })]).select("status");
    expect(r.error).toBeNull();
    expect(r.data!.map((x: { status: string }) => x.status)).toEqual([expect.any(String), "published"]);
  });

  it("update returns the affected rows and only those", async () => {
    await seedSubmissions();
    const r = await db.from("token_submissions").update({ status: "suspended", rejection_reason: "scam" }).eq("owner_id", B).eq("status", "published").select("symbol,status");
    expect(r.data).toEqual([{ symbol: "GAM", status: "suspended" }]);
    expect((await db.from("token_submissions").select("id").eq("status", "suspended")).data).toHaveLength(1);
    expect((await db.from("token_submissions").update({ status: "draft" }).eq("address", "none").select("id")).data).toEqual([]);
  });

  it("update and delete refuse to run without a filter", async () => {
    await seedSubmissions();
    expect((await db.from("token_submissions").update({ status: "draft" })).error?.code).toBe("DB_UNSAFE");
    expect((await db.from("token_submissions").delete()).error?.code).toBe("DB_UNSAFE");
    expect((await db.from("token_submissions").select("id")).data).toHaveLength(4);
  });

  it("upsert inserts, then merges on the conflict columns", async () => {
    const { data: wl } = await db.from("watchlists").insert({ user_id: A, name: "fav" }).select("id").single();
    const row = { watchlist_id: wl.id, network_id: "solana", address: "mint1" };
    expect((await db.from("watchlist_items").upsert(row, { onConflict: "watchlist_id,network_id,address" })).error).toBeNull();
    expect((await db.from("watchlist_items").upsert(row, { onConflict: "watchlist_id,network_id,address" })).error).toBeNull();
    expect((await db.from("watchlist_items").select("address", { count: "exact", head: true }).eq("watchlist_id", wl.id)).count).toBe(1);
  });

  it("upsert updates non conflict columns", async () => {
    await db.from("watchlists").insert({ user_id: A, name: "fav" });
    const r = await db.from("watchlists").upsert({ user_id: A, name: "fav" }, { onConflict: "user_id,name" }).select("name");
    expect(r.data).toEqual([{ name: "fav" }]);
  });

  it("delete removes only the matching rows", async () => {
    await db.from("watchlists").insert([{ user_id: A, name: "x" }, { user_id: A, name: "y" }, { user_id: B, name: "x" }]);
    const r = await db.from("watchlists").delete().eq("user_id", A).eq("name", "x").select("name");
    expect(r.data).toEqual([{ name: "x" }]);
    expect((await db.from("watchlists").select("id", { count: "exact", head: true })).count).toBe(2);
  });

  it("surfaces unique violations with the SQLSTATE code", async () => {
    await db.from("watchlists").insert({ user_id: A, name: "dup" });
    const r = await db.from("watchlists").insert({ user_id: A, name: "dup" });
    expect(r.data).toBeNull();
    expect(r.error?.code).toBe("23505");
    expect(typeof r.error?.message).toBe("string");
  });

  it("surfaces check and foreign key violations", async () => {
    expect((await db.from("watchlists").insert({ user_id: A, name: "" })).error?.code).toBe("23514");
    expect((await db.from("watchlist_items").insert({ watchlist_id: "11111111-1111-1111-1111-111111111111", network_id: "n", address: "a" })).error?.code).toBe("23503");
  });

  it("stores objects and arrays in jsonb columns and reads them back", async () => {
    const filters = { chain: "solana", tags: ["a", "b"], nested: { n: 1, quote: "it's \"here\"; drop table x;--" } };
    const ins = await db.from("saved_searches").insert({ user_id: A, name: "s", filters }).select("filters").single();
    expect(ins.error).toBeNull();
    expect(ins.data.filters).toEqual(filters);
    await db.from("saved_searches").update({ filters: ["x", 1, null] }).eq("user_id", A);
    expect((await db.from("saved_searches").select("filters").single()).data.filters).toEqual(["x", 1, null]);
  });

  it("casts range text values for range columns", async () => {
    const camp = "11111111-1111-1111-1111-1111111111b1";
    await db.from("advertising_campaigns").insert({ id: camp, owner_id: A, placement_id: "trending", destination_url: "https://a.example", starts_at: "2027-01-01T00:00:00Z", ends_at: "2027-01-03T00:00:00Z" });
    const r = await db.from("exclusive_reservations").insert({ campaign_id: camp, placement_id: "trending", slot: 1, during: "[2027-01-01T00:00:00.000Z,2027-01-03T00:00:00.000Z)" });
    expect(r.error).toBeNull();
    const clash = await db.from("exclusive_reservations").insert({ campaign_id: camp, placement_id: "trending", slot: 1, during: "[2027-01-02T00:00:00.000Z,2027-01-04T00:00:00.000Z)" });
    expect(clash.error?.code).toBe("23P01");
  });
});

describe("safety", () => {
  beforeEach(seedSubmissions);

  it("rejects hostile table and column identifiers before anything is sent", async () => {
    const sent: string[] = [];
    const spy = createDbClient(async (text, params) => {
      sent.push(text);
      return executorFor(pg)(text, params);
    });
    const bad = ['name"; drop table token_submissions;--', "name; select 1", "Name", "1name", "na me", "name--", "", "a".repeat(64), "name)"];
    for (const b of bad) {
      expect((await spy.from(b).select("id")).error?.code, `table ${b}`).toBe("DB_IDENT");
      expect((await spy.from("token_submissions").select(b)).error?.code, `select ${b}`).toBe("DB_IDENT");
      expect((await spy.from("token_submissions").select("id").eq(b, 1)).error?.code, `eq ${b}`).toBe("DB_IDENT");
      expect((await spy.from("token_submissions").select("id").in(b, [1])).error?.code, `in ${b}`).toBe("DB_IDENT");
      expect((await spy.from("token_submissions").select("id").order(b)).error?.code, `order ${b}`).toBe("DB_IDENT");
      expect((await spy.from("token_submissions").insert({ [b]: 1 })).error?.code, `insert ${b}`).toBe("DB_IDENT");
      expect((await spy.from("token_submissions").update({ [b]: 1 }).eq("id", "x")).error?.code, `update ${b}`).toBe("DB_IDENT");
      expect((await spy.from("token_submissions").upsert({ id: 1 }, { onConflict: b })).error?.code, `upsert ${b}`).toBe("DB_IDENT");
    }
    expect(sent).toEqual([]);
    expect((await db.from("token_submissions").select("id")).data).toHaveLength(4);
  });

  it("rejects malformed or() filters and unsupported operators", async () => {
    for (const expr of ["name.eq", "name", "name.bogus.1", "name.eq.1,(", 'name.eq."open', "x; drop table y.eq.1", "or(name.eq.1,symbol.eq.2)", "", "name.is.maybe", "name.in.1,2"]) {
      expect((await db.from("token_submissions").select("id").or(expr)).error, expr).toBeTruthy();
    }
    expect((await db.from("token_submissions").select("id")).data).toHaveLength(4);
  });

  it("keeps quotes, semicolons and sql text in values as plain data", async () => {
    const nasty = `x'); drop table token_submissions; --`;
    const ins = await db.from("token_submissions").insert(submission({ address: "n1", name: nasty, symbol: "NAS" })).select("name").single();
    expect(ins.data.name).toBe(nasty);
    expect((await db.from("token_submissions").select("symbol").eq("name", nasty).single()).data).toEqual({ symbol: "NAS" });
    expect((await db.from("token_submissions").select("symbol").or(`name.eq."${nasty.replace(/"/g, '\\"')}",symbol.eq.ZZZ`)).data).toEqual([{ symbol: "NAS" }]);
    expect((await db.from("token_submissions").select("symbol").ilike("name", "%drop table%")).data).toEqual([{ symbol: "NAS" }]);
    expect((await db.from("token_submissions").select("symbol").in("symbol", [nasty, "ALP"])).data).toEqual([{ symbol: "ALP" }]);
    expect((await db.from("token_submissions").select("id", { count: "exact", head: true })).count).toBe(5);
    expect((await db.from("token_submissions").update({ rejection_reason: "1; delete from token_submissions" }).eq("address", "n1").select("rejection_reason").single()).data.rejection_reason).toBe("1; delete from token_submissions");
  });

  it("rejects invalid limits and ranges", async () => {
    expect((await db.from("token_submissions").select("id").limit(-1)).error?.code).toBe("DB_ARG");
    expect((await db.from("token_submissions").select("id").limit(1.5)).error?.code).toBe("DB_ARG");
    expect((await db.from("token_submissions").select("id").range(5, 1)).error?.code).toBe("DB_ARG");
    expect((await db.from("token_submissions").select("id").limit(Number.NaN)).error?.code).toBe("DB_ARG");
  });

  it("passes raw statements through with bound parameters", async () => {
    const rows = await db.sql("select count(*)::int as n from token_submissions where owner_id = $1", [A]);
    expect(rows).toEqual([{ n: 2 }]);
  });
});
