import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createDbClient } from "@/lib/db/builder";
import { executorFor, migratedDb } from "./pg-helper";

const state = vi.hoisted(() => ({ pg: null as PGlite | null }));

vi.mock("@/lib/db", async () => {
  const { createDbClient: make } = await import("@/lib/db/builder");
  const { executorFor: exec } = await import("./pg-helper");
  return {
    dbConfigured: () => true,
    getDb: () => make(exec(state.pg!)),
    userFromRequest: async (req: Request) => {
      const t = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      return t?.startsWith("tok-") ? { id: t.slice(4), email: null } : null;
    },
  };
});

const ORDER_L = "11111111-1111-4111-8111-1111111111a1";
const ORDER_B = "22222222-2222-4222-8222-2222222222b2";

function get(qs = "") {
  return new Request(`http://x/api/admin/payments${qs}`, { headers: { authorization: "Bearer tok-did:privy:support", "x-forwarded-for": "10.9.9.9" } });
}

beforeAll(async () => {
  state.pg = await migratedDb();
  const db = createDbClient(executorFor(state.pg));
  await db.from("user_roles").insert({ user_id: "did:privy:support", role: "support_agent" });
  await db.from("orders").insert([
    { id: ORDER_L, user_id: "did:privy:alice", kind: "listing", ref_id: ORDER_L, price_usd: 300 },
    { id: ORDER_B, user_id: "did:privy:bob", kind: "boost", ref_id: ORDER_B, price_usd: 49.5 },
  ]);
  await db.from("payments").insert([
    { order_id: ORDER_L, provider: "nowpayments", provider_payment_id: "p1", pay_currency: "usdtbsc", pay_amount: 300, status: "finished" },
    { order_id: ORDER_B, provider: "nowpayments", provider_payment_id: "p2", pay_currency: "sol", pay_amount: 0.4, status: "waiting" },
  ]);
});

describe("GET /api/admin/payments against a real schema", () => {
  it("joins each payment with its order and counts the total", async () => {
    const { GET } = await import("@/app/api/admin/payments/route");
    const res = await GET(get());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(2);
    const first = body.items.find((i: { provider_payment_id: string }) => i.provider_payment_id === "p2");
    expect(first.orders).toMatchObject({ id: ORDER_B, kind: "boost", price_usd: 49.5, status: "pending" });
    expect(first.pay_amount).toBe(0.4);
  });

  it("filters by status, product kind and exact ids", async () => {
    const { GET } = await import("@/app/api/admin/payments/route");
    const ids = async (qs: string) => ((await (await GET(get(qs))).json()).items as Array<{ provider_payment_id: string }>).map((i) => i.provider_payment_id);
    expect(await ids("?status=finished")).toEqual(["p1"]);
    expect(await ids("?kind=boost")).toEqual(["p2"]);
    expect(await ids(`?q=${ORDER_L}`)).toEqual(["p1"]);
    expect(await ids("?q=p2")).toEqual(["p2"]);
    expect(await ids("?q=p2%27%20or%201%3D1--")).toEqual([]);
    expect(await ids("?limit=1&offset=1")).toHaveLength(1);
  });
});
