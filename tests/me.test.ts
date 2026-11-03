import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, type Tables } from "./admin-fakedb";

const state: { tables: Tables } = { tables: {} };

vi.mock("@/lib/db", () => ({
  dbConfigured: () => true,
  getDb: () => createFakeDb(state.tables, new Set()),
  userFromRequest: async (req: Request) => {
    const t = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    return t?.startsWith("tok-") ? { id: t.slice(4), email: `${t.slice(4)}@example.test` } : null;
  },
}));

const as = (uid: string | null, init: RequestInit = {}, url = "http://x/api") => new Request(url, { ...init, headers: { ...(uid ? { authorization: `Bearer tok-${uid}` } : {}), "content-type": "application/json" } });

beforeEach(() => {
  state.tables = {
    token_submissions: [
      { id: "s1", owner_id: "alice", name: "Alpha", symbol: "ALP", status: "published", created_at: "2026-12-01T00:00:00Z" },
      { id: "s2", owner_id: "bob", name: "Beta", symbol: "BET", status: "draft", created_at: "2026-12-01T00:00:00Z" },
    ],
    orders: [
      { id: "o1", user_id: "alice", kind: "listing", price_usd: 300, status: "paid", created_at: "2026-12-01T00:00:00Z" },
      { id: "o2", user_id: "bob", kind: "boost", price_usd: 50, status: "pending", created_at: "2026-12-01T00:00:00Z" },
    ],
    boost_campaigns: [{ id: "b1", owner_id: "bob", submission_id: "s2", pack_id: "spark", status: "active" }],
    advertising_campaigns: [{ id: "c1", owner_id: "alice", placement_id: "hero", status: "active", starts_at: "a", ends_at: "b", headline: "H", created_at: "x" }],
    ad_events: [
      { campaign_id: "c1", kind: "impression" },
      { campaign_id: "c1", kind: "impression" },
      { campaign_id: "c1", kind: "click" },
      { campaign_id: "other", kind: "impression" },
    ],
  };
});

describe("GET /api/me/overview", () => {
  it("requires sign in", async () => {
    const { GET } = await import("@/app/api/me/overview/route");
    expect((await GET(as(null))).status).toBe(401);
  });
  it("returns only the caller's own rows with measured stats", async () => {
    const { GET } = await import("@/app/api/me/overview/route");
    const j = await (await GET(as("alice"))).json();
    expect(j.submissions.map((s: { id: string }) => s.id)).toEqual(["s1"]);
    expect(j.orders.map((o: { id: string }) => o.id)).toEqual(["o1"]);
    expect(j.boosts).toEqual([]);
    expect(j.campaigns[0]).toMatchObject({ id: "c1", impressions: 2, clicks: 1 });
  });
  it("never leaks another user's data", async () => {
    const { GET } = await import("@/app/api/me/overview/route");
    const j = await (await GET(as("bob"))).json();
    expect(j.submissions.map((s: { id: string }) => s.id)).toEqual(["s2"]);
    expect(j.campaigns).toEqual([]);
    expect(j.boosts[0].projectName).toBe("Beta");
  });
});

describe("watchlist input rules", () => {
  it("requires sign in", async () => {
    const { POST } = await import("@/app/api/watchlist/route");
    expect((await POST(as(null, { method: "POST", body: "{}" }))).status).toBe(401);
  });
  it("rejects bad networks, addresses and Bitcoin", async () => {
    const { POST } = await import("@/app/api/watchlist/route");
    for (const body of [
      { network: "nope", address: "0x" + "a".repeat(40) },
      { network: "ethereum", address: "not-an-address-at-all" },
      { network: "bitcoin", address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq" },
    ]) {
      expect((await POST(as("alice", { method: "POST", body: JSON.stringify(body) }))).status).toBe(422);
    }
  });
});
