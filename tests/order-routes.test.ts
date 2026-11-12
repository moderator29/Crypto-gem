import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOrderDb, type Tables } from "./order-fakedb";

const state = vi.hoisted(() => ({ tables: {} as Record<string, Array<Record<string, unknown>>>, fulfilled: [] as string[], verified: [] as string[], now: { configured: false } }));

vi.mock("@/lib/supabase/admin", async () => {
  const { createOrderDb: make } = await import("./order-fakedb");
  return {
    supabaseConfigured: () => true,
    supabaseAdmin: () => make(state.tables),
    userFromRequest: async (req: Request) => {
      const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      return token?.startsWith("tok-") ? { id: token.slice(4), email: null } : null;
    },
  };
});
vi.mock("@/lib/payments/nowpayments", () => ({ isConfigured: () => state.now.configured, nowpayments: {} }));
vi.mock("@/lib/payments/fulfil", () => ({ fulfilOrder: async (_db: unknown, o: { id: string }) => void state.fulfilled.push(o.id) }));
vi.mock("@/lib/notify", () => ({ notify: async () => true }));
vi.mock("@/lib/payments/direct/service", () => ({
  refreshPayment: async (_db: unknown, row: { id: string }) => (state.verified.push(row.id), { status: "waiting", message: null }),
}));

const SUB = "11111111-1111-4111-8111-111111111111";
let ip = 0;
let n = 0;

function req(path: string, token: string | null, body: unknown, kind: "json" | "form" = "json"): Request {
  const headers: Record<string, string> = { "x-forwarded-for": `10.1.0.${++ip}` };
  if (token) headers.authorization = `Bearer ${token}`;
  if (kind === "json") headers["content-type"] = "application/json";
  return new Request(`http://x${path}`, { method: "POST", headers, body: kind === "json" ? JSON.stringify(body) : (body as FormData) });
}

const staff = (...roles: string[]) => {
  const id = `s${++n}`;
  for (const role of roles) state.tables.user_roles!.push({ user_id: id, role });
  return `tok-${id}`;
};

beforeEach(() => {
  state.fulfilled = [];
  state.verified = [];
  state.now.configured = false;
  const t: Tables = {
    token_submissions: [{ id: SUB, status: "published" }],
    boost_packs: [{ id: "spark", price_usd: 30, active: true }],
    boost_campaigns: [],
    orders: [],
    payments: [],
    user_roles: [],
    admin_audit_logs: [],
  };
  state.tables = t as typeof state.tables;
});

describe("boost order without a currency", () => {
  it("creates a pending order, ignores payCurrency and needs no NOWPayments", async () => {
    const { POST } = await import("@/app/api/boost/orders/route");
    for (const extra of [{}, { payCurrency: "usdtbsc" }]) {
      const res = await POST(req("/api/boost/orders", "tok-u1", { submissionId: SUB, packId: "spark", ...extra }));
      expect(res.status).toBe(200);
      const j = (await res.json()) as { orderId: string };
      expect(j.orderId).toBeTruthy();
    }
    const orders = state.tables.orders!;
    expect(orders).toHaveLength(2);
    expect(orders[0]).toMatchObject({ kind: "boost", price_usd: 30, user_id: "u1" });
    expect(state.tables.boost_campaigns![0]).toMatchObject({ status: "awaiting_payment", owner_id: "u1" });
  });

  it("keeps the eligibility and auth checks", async () => {
    const { POST } = await import("@/app/api/boost/orders/route");
    expect((await POST(req("/api/boost/orders", null, { submissionId: SUB, packId: "spark" }))).status).toBe(401);
    expect((await POST(req("/api/boost/orders", "tok-u2", { submissionId: "bad", packId: "spark" }))).status).toBe(422);
    state.tables.token_submissions![0]!.status = "pending_review";
    expect((await POST(req("/api/boost/orders", "tok-u2", { submissionId: SUB, packId: "spark" }))).status).toBe(409);
    expect(state.tables.orders).toHaveLength(0);
  });
});

describe("listing order without a currency", () => {
  it("creates the submission and a pending order from a body with no payCurrency", async () => {
    process.env.NEXT_PUBLIC_PRIVY_APP_ID ||= "test";
    process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://x";
    process.env.SUPABASE_SECRET_KEY ||= "test";
    state.tables.token_submissions = [];
    state.tables.listing_packages = [{ id: "pro", price_usd: 500, active: true }];
    const { POST } = await import("@/app/api/listings/route");
    const body = { mode: "standard", network: null, address: null, package: "pro", form: { name: "Alpha", symbol: "ALP", description: "A project description that is long enough to pass.", website: "", twitter: "", telegram: "", discord: "", medium: "", coingecko: "", coinmarketcap: "", logoUrl: "", email: "a@example.test" } };
    const res = await POST(req("/api/listings", "tok-u9", body));
    expect(res.status).toBe(200);
    expect(state.tables.orders![0]).toMatchObject({ kind: "listing", price_usd: 500, user_id: "u9" });
    expect(state.tables.token_submissions![0]).toMatchObject({ status: "awaiting_payment" });
  });
});

describe("admin payment actions", () => {
  const PAY = "22222222-2222-4222-8222-222222222222";
  const ORDER = "33333333-3333-4333-8333-333333333333";
  beforeEach(() => {
    state.tables.orders!.push({ id: ORDER, user_id: "buyer", kind: "boost", ref_id: "c1", status: "pending", price_usd: 30 });
    state.tables.payments!.push({ id: PAY, order_id: ORDER, provider: "direct", status: "waiting", pay_currency: "usdt-bsc" });
  });
  const act = async (token: string | null, body: unknown) => {
    const { POST } = await import("@/app/api/admin/payments/action/route");
    const res = await POST(req("/api/admin/payments/action", token, body));
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  };

  it("rejects anonymous callers and roles that cannot write", async () => {
    expect((await act(null, { paymentId: PAY, action: "verify" })).status).toBe(401);
    expect((await act(staff("listing_reviewer"), { paymentId: PAY, action: "verify" })).status).toBe(403);
    const support = staff("support_agent");
    expect((await act(support, { paymentId: PAY, action: "mark_paid", reason: "checked on the explorer" })).status).toBe(403);
    expect(state.tables.orders![0]!.status).toBe("pending");
    expect(state.fulfilled).toHaveLength(0);
  });

  it("verify is open to support, runs the chain check and is audited", async () => {
    const res = await act(staff("support_agent"), { paymentId: PAY, action: "verify" });
    expect(res.status).toBe(200);
    expect(state.verified).toEqual([PAY]);
    expect(state.tables.admin_audit_logs![0]).toMatchObject({ action: "payment.verify", target: `payments:${PAY}` });
  });

  it("mark paid needs a written reason, then pays and fulfils exactly once", async () => {
    const admin = staff("admin");
    expect((await act(admin, { paymentId: PAY, action: "mark_paid" })).status).toBe(422);
    expect((await act(admin, { paymentId: PAY, action: "mark_paid", reason: "short" })).status).toBe(422);
    expect(state.tables.orders![0]!.status).toBe("pending");

    const ok = await act(admin, { paymentId: PAY, action: "mark_paid", reason: "Confirmed transfer on the explorer" });
    expect(ok.status).toBe(200);
    expect(state.tables.orders![0]!.status).toBe("paid");
    expect(state.tables.payments![0]!.status).toBe("finished");
    expect(state.fulfilled).toEqual([ORDER]);
    expect(state.tables.admin_audit_logs![0]).toMatchObject({ action: "payment.mark_paid" });

    const again = await act(admin, { paymentId: PAY, action: "mark_paid", reason: "Confirmed transfer on the explorer" });
    expect(again.status).toBe(409);
    expect(state.fulfilled).toHaveLength(1);
  });

  it("reject closes an open payment with an audit row and never pays the order", async () => {
    const res = await act(staff("admin"), { paymentId: PAY, action: "reject", reason: "Wrong network, funds returned" });
    expect(res.status).toBe(200);
    expect(state.tables.payments![0]!.status).toBe("failed");
    expect(state.tables.orders![0]!.status).toBe("pending");
    expect(state.tables.admin_audit_logs![0]).toMatchObject({ action: "payment.reject" });
  });

  it("only acts on direct payments", async () => {
    state.tables.payments![0]!.provider = "nowpayments";
    expect((await act(staff("admin"), { paymentId: PAY, action: "reject", reason: "not our provider" })).status).toBe(404);
  });
});
