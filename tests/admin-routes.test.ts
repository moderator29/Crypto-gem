import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, type Tables } from "./admin-fakedb";

const state = vi.hoisted(() => ({
  tables: {} as Record<string, Array<Record<string, unknown>>>,
  failures: new Set<string>(),
  provider: { configured: true, fail: false, currencies: ["usdtbsc", "sol"] as string[] },
}));

vi.mock("@/lib/supabase/admin", async () => {
  const { createFakeDb: make } = await import("./admin-fakedb");
  return {
    supabaseConfigured: () => true,
    supabaseAdmin: () => make(state.tables, state.failures),
    userFromRequest: async (req: Request) => {
      const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      return token?.startsWith("tok-") ? { id: token.slice(4), email: `${token.slice(4)}@example.test` } : null;
    },
  };
});

vi.mock("@/lib/payments/nowpayments", () => ({
  isConfigured: () => state.provider.configured,
  nowpayments: {
    currencies: async () => {
      if (state.provider.fail) throw new Error("down");
      return state.provider.currencies;
    },
  },
}));

const SUB = "11111111-1111-4111-8111-111111111111";
const CREATIVE = "22222222-2222-4222-8222-222222222222";
let n = 0;
let ip = 0;

/** Create a user with the given roles and return its bearer token. Each test gets fresh ids so rate limits never bleed. */
function user(...roles: string[]): string {
  const id = `u${++n}-${Math.random().toString(16).slice(2, 8)}`;
  for (const role of roles) state.tables.user_roles!.push({ user_id: id, role });
  return `tok-${id}`;
}

async function call(path: string, method: string, token: string | null, body?: unknown, search = ""): Promise<{ status: number; body: Record<string, unknown> }> {
  const mod = (await ROUTES[path]!()) as Record<string, (req: Request) => Promise<Response>>;
  const headers: Record<string, string> = { "x-forwarded-for": `10.0.0.${++ip}` };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await mod[method]!(new Request(`http://x/api/admin/${path}${search}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const ROUTES: Record<string, () => Promise<unknown>> = {
  me: () => import("@/app/api/admin/me/route"),
  overview: () => import("@/app/api/admin/overview/route"),
  listings: () => import("@/app/api/admin/listings/route"),
  prices: () => import("@/app/api/admin/prices/route"),
  "payment-methods": () => import("@/app/api/admin/payment-methods/route"),
  payments: () => import("@/app/api/admin/payments/route"),
  creatives: () => import("@/app/api/admin/creatives/route"),
  audit: () => import("@/app/api/admin/audit/route"),
};

const audits = () => state.tables.admin_audit_logs!;

beforeEach(() => {
  state.failures.clear();
  state.provider = { configured: true, fail: false, currencies: ["usdtbsc", "sol"] };
  const t: Tables = {
    user_roles: [],
    admin_audit_logs: [],
    moderation_notes: [],
    token_submissions: [{ id: SUB, status: "pending_review", rejection_reason: null, published_at: null, name: "Alpha" }],
    orders: [{ id: "o1", kind: "listing", ref_id: SUB, status: "paid", price_usd: 300, created_at: "2026-11-01" }],
    payments: [],
    listing_packages: [{ id: "starter", name: "Starter", price_usd: 300, active: true }],
    boost_packs: [{ id: "spark", name: "Spark", price_usd: 30, credits: 50, duration_hours: 6, active: true }],
    advertising_placements: [{ id: "hero", name: "Hero", prices: { "1": 350 }, active: true }],
    payment_methods: [
      { id: "usdt-bsc", provider_currency: "usdtbsc", enabled: false, sort: 1 },
      { id: "avax", provider_currency: "avax", enabled: false, sort: 2 },
    ],
    campaign_creatives: [{ id: CREATIVE, campaign_id: "c1", variant: "desktop", review_status: "pending", review_note: null }],
  };
  state.tables = t as typeof state.tables;
});

describe("role enforcement", () => {
  const GETS = ["overview", "listings", "prices", "payment-methods", "payments", "creatives", "audit"];

  it("returns 401 with no token and 401 for an unknown token on every route", async () => {
    for (const path of GETS) {
      expect((await call(path, "GET", null)).status, path).toBe(401);
      expect((await call(path, "GET", "garbage")).status, path).toBe(401);
    }
  });

  it("returns 403 for a signed-in user with no staff role and never touches data", async () => {
    const nobody = user();
    const plain = user("user", "project_owner");
    for (const token of [nobody, plain]) {
      for (const path of GETS) expect((await call(path, "GET", token)).status, path).toBe(403);
      expect((await call("listings", "POST", token, { id: SUB, action: "approve" })).status).toBe(403);
      expect((await call("prices", "PUT", token, { table: "listing_packages", id: "starter", patch: { price_usd: 1 } })).status).toBe(403);
      expect((await call("payment-methods", "PUT", token, { id: "usdt-bsc", enabled: true })).status).toBe(403);
      expect((await call("creatives", "POST", token, { id: CREATIVE, decision: "approve" })).status).toBe(403);
    }
    expect(state.tables.token_submissions![0]!.status).toBe("pending_review");
    expect(audits()).toHaveLength(0);
  });

  it("applies the per-role matrix", async () => {
    const reviewer = user("listing_reviewer");
    const support = user("support_agent");
    const ads = user("advertising_manager");
    const admin = user("admin");
    expect((await call("listings", "GET", reviewer)).status).toBe(200);
    expect((await call("listings", "GET", support)).status).toBe(200);
    expect((await call("listings", "POST", support, { id: SUB, action: "approve" })).status).toBe(403);
    expect((await call("payments", "GET", reviewer)).status).toBe(403);
    expect((await call("payments", "GET", support)).status).toBe(200);
    expect((await call("audit", "GET", reviewer)).status).toBe(403);
    expect((await call("audit", "GET", admin)).status).toBe(200);
    expect((await call("prices", "PUT", ads, { table: "listing_packages", id: "starter", patch: { price_usd: 310 } })).status).toBe(403);
    expect((await call("prices", "PUT", ads, { table: "advertising_placements", id: "hero", patch: { prices: { "1": 360 } } })).status).toBe(200);
    expect((await call("creatives", "GET", ads)).status).toBe(200);
    expect((await call("creatives", "GET", support)).status).toBe(403);
  });

  it("lets super_admin through every check", async () => {
    const root = user("super_admin");
    for (const path of GETS) expect((await call(path, "GET", root)).status, path).toBe(200);
    expect((await call("prices", "PUT", root, { table: "boost_packs", id: "spark", patch: { price_usd: 31 } })).status).toBe(200);
  });

  it("reports roles from the database, ignoring anything the client says", async () => {
    const reviewer = user("listing_reviewer", "user");
    const me = await call("me", "GET", reviewer);
    expect(me.status).toBe(200);
    expect(me.body.roles).toEqual(["listing_reviewer"]);
    expect((await call("me", "GET", null)).status).toBe(401);
  });

  it("rate limits writes per actor", async () => {
    const reviewer = user("listing_reviewer");
    let last = 0;
    for (let i = 0; i < 31; i += 1) last = (await call("listings", "POST", reviewer, { id: SUB, action: "note", reason: `note ${i}` })).status;
    expect(last).toBe(429);
  });
});

describe("listing actions", () => {
  it("approves, publishes and audits each step with before and after", async () => {
    const reviewer = user("listing_reviewer");
    expect((await call("listings", "POST", reviewer, { id: SUB, action: "approve" })).status).toBe(200);
    expect(state.tables.token_submissions![0]!.status).toBe("approved");
    expect((await call("listings", "POST", reviewer, { id: SUB, action: "publish" })).status).toBe(200);
    expect(state.tables.token_submissions![0]!.status).toBe("published");
    expect(state.tables.token_submissions![0]!.published_at).toBeTruthy();
    expect(audits().map((a) => a.action)).toEqual(["listing.approve", "listing.publish"]);
    expect(audits()[1]).toMatchObject({ target: `token_submissions:${SUB}`, before: { status: "approved" }, after: { status: "published" } });
  });

  it("requires a reason to reject, then stores it as a note and audits it", async () => {
    const reviewer = user("listing_reviewer");
    expect((await call("listings", "POST", reviewer, { id: SUB, action: "reject" })).status).toBe(422);
    expect(audits()).toHaveLength(0);
    expect((await call("listings", "POST", reviewer, { id: SUB, action: "reject", reason: "Contract is a clone" })).status).toBe(200);
    expect(state.tables.token_submissions![0]).toMatchObject({ status: "rejected", rejection_reason: "Contract is a clone" });
    expect(state.tables.moderation_notes).toHaveLength(1);
    expect(audits()[0]).toMatchObject({ action: "listing.reject", after: { status: "rejected", reason: "Contract is a clone" } });
  });

  it("refuses illegal transitions without writing or auditing", async () => {
    const reviewer = user("listing_reviewer");
    state.tables.token_submissions![0]!.status = "awaiting_payment";
    const res = await call("listings", "POST", reviewer, { id: SUB, action: "approve" });
    expect(res.status).toBe(409);
    expect(state.tables.token_submissions![0]!.status).toBe("awaiting_payment");
    expect(audits()).toHaveLength(0);
  });

  it("will not publish a listing without a paid order", async () => {
    const reviewer = user("listing_reviewer");
    state.tables.token_submissions![0]!.status = "approved";
    state.tables.orders![0]!.status = "pending";
    const res = await call("listings", "POST", reviewer, { id: SUB, action: "publish" });
    expect(res.status).toBe(409);
    expect(state.tables.token_submissions![0]!.status).toBe("approved");
    expect(audits()).toHaveLength(0);
  });

  it("validates the body and the id", async () => {
    const reviewer = user("listing_reviewer");
    expect((await call("listings", "POST", reviewer, { id: "nope", action: "approve" })).status).toBe(422);
    expect((await call("listings", "POST", reviewer, { id: SUB, action: "delete" })).status).toBe(422);
    expect((await call("listings", "POST", reviewer, { id: "33333333-3333-4333-8333-333333333333", action: "approve" })).status).toBe(404);
  });

  it("records a note without changing status and audits it", async () => {
    const reviewer = user("listing_reviewer");
    expect((await call("listings", "POST", reviewer, { id: SUB, action: "note", reason: "Waiting on team call" })).status).toBe(200);
    expect(state.tables.token_submissions![0]!.status).toBe("pending_review");
    expect(audits()[0]).toMatchObject({ action: "listing.note" });
  });

  it("filters the queue by status and returns detail with notes", async () => {
    const reviewer = user("listing_reviewer");
    const queue = await call("listings", "GET", reviewer);
    expect((queue.body.items as unknown[]).length).toBe(1);
    const none = await call("listings", "GET", reviewer, undefined, "?status=published");
    expect((none.body.items as unknown[]).length).toBe(0);
    expect((await call("listings", "GET", reviewer, undefined, "?status=bogus")).status).toBe(422);
    const detail = await call("listings", "GET", reviewer, undefined, `?id=${SUB}`);
    expect(detail.status).toBe(200);
    expect((detail.body.orders as unknown[]).length).toBe(1);
  });

  it("reports a failed audit write instead of pretending success", async () => {
    const reviewer = user("listing_reviewer");
    state.failures.add("admin_audit_logs.insert");
    const res = await call("listings", "POST", reviewer, { id: SUB, action: "approve" });
    expect(res.status).toBe(500);
    expect(res.body.applied).toBe(true);
  });
});

describe("price updates", () => {
  it("updates a price and audits the full before and after rows", async () => {
    const admin = user("admin");
    const res = await call("prices", "PUT", admin, { table: "listing_packages", id: "starter", patch: { price_usd: 350 } });
    expect(res.status).toBe(200);
    expect(state.tables.listing_packages![0]!.price_usd).toBe(350);
    expect(audits()).toHaveLength(1);
    expect(audits()[0]).toMatchObject({ action: "prices.listing_packages.update", target: "listing_packages:starter", before: { price_usd: 300 }, after: { price_usd: 350 } });
  });

  it("rejects invalid numbers and unknown rows with no change and no audit", async () => {
    const admin = user("admin");
    for (const price_usd of [-5, 12.345, "free"]) {
      expect((await call("prices", "PUT", admin, { table: "listing_packages", id: "starter", patch: { price_usd } })).status).toBe(422);
    }
    expect((await call("prices", "PUT", admin, { table: "boost_packs", id: "missing", patch: { price_usd: 5 } })).status).toBe(404);
    expect(state.tables.listing_packages![0]!.price_usd).toBe(300);
    expect(audits()).toHaveLength(0);
  });

  it("does not write updated_at to boost_packs, which has no such column", async () => {
    const admin = user("admin");
    await call("prices", "PUT", admin, { table: "boost_packs", id: "spark", patch: { credits: 60 } });
    expect(state.tables.boost_packs![0]).not.toHaveProperty("updated_at");
    expect(audits()[0]).toMatchObject({ action: "prices.boost_packs.update" });
  });
});

describe("payment methods", () => {
  it("refuses to enable a currency the provider does not list", async () => {
    const admin = user("admin");
    const res = await call("payment-methods", "PUT", admin, { id: "avax", enabled: true });
    expect(res.status).toBe(409);
    expect(state.tables.payment_methods![1]!.enabled).toBe(false);
    expect(audits()).toHaveLength(0);
  });

  it("enables a listed currency, case-insensitively, and audits it", async () => {
    const admin = user("admin");
    state.provider.currencies = ["USDTBSC"];
    expect((await call("payment-methods", "PUT", admin, { id: "usdt-bsc", enabled: true })).status).toBe(200);
    expect(state.tables.payment_methods![0]!.enabled).toBe(true);
    expect(audits()[0]).toMatchObject({ action: "payment_method.enable", before: { enabled: false }, after: { enabled: true } });
  });

  it("will not enable when the provider is unconfigured or down, but always allows disabling", async () => {
    const admin = user("admin");
    state.provider.configured = false;
    expect((await call("payment-methods", "PUT", admin, { id: "usdt-bsc", enabled: true })).status).toBe(503);
    state.provider.configured = true;
    state.provider.fail = true;
    expect((await call("payment-methods", "PUT", admin, { id: "usdt-bsc", enabled: true })).status).toBe(502);
    state.tables.payment_methods![0]!.enabled = true;
    expect((await call("payment-methods", "PUT", admin, { id: "usdt-bsc", enabled: false })).status).toBe(200);
    expect(audits().map((a) => a.action)).toEqual(["payment_method.disable"]);
  });

  it("shows whether the provider lists each method", async () => {
    const admin = user("admin");
    const res = await call("payment-methods", "GET", admin);
    const methods = res.body.methods as Array<{ id: string; providerListed: boolean | null }>;
    expect(res.body.providerStatus).toBe("ok");
    expect(methods.find((m) => m.id === "usdt-bsc")?.providerListed).toBe(true);
    expect(methods.find((m) => m.id === "avax")?.providerListed).toBe(false);
  });
});

describe("creative review", () => {
  it("requires a note to reject, approves a pending creative and audits the decision", async () => {
    const ads = user("advertising_manager");
    expect((await call("creatives", "POST", ads, { id: CREATIVE, decision: "reject" })).status).toBe(422);
    expect((await call("creatives", "POST", ads, { id: CREATIVE, decision: "approve" })).status).toBe(200);
    expect(state.tables.campaign_creatives![0]!.review_status).toBe("approved");
    expect(audits()[0]).toMatchObject({ action: "creative.approve", before: { review_status: "pending" }, after: { review_status: "approved" } });
  });

  it("will not decide a creative twice", async () => {
    const ads = user("advertising_manager");
    await call("creatives", "POST", ads, { id: CREATIVE, decision: "reject", note: "Misleading claim" });
    const again = await call("creatives", "POST", ads, { id: CREATIVE, decision: "approve" });
    expect(again.status).toBe(409);
    expect(state.tables.campaign_creatives![0]).toMatchObject({ review_status: "rejected", review_note: "Misleading claim" });
    expect(audits()).toHaveLength(1);
  });
});

describe("read routes", () => {
  it("returns overview counts from real rows and the audit log newest first", async () => {
    const admin = user("admin");
    state.tables.orders!.push({ id: "o2", kind: "boost", ref_id: "x", status: "paid", price_usd: 50.5, created_at: "2026-11-02" });
    const o = await call("overview", "GET", admin);
    expect(o.status).toBe(200);
    expect(o.body).toMatchObject({ pendingSubmissions: 1, publishedListings: 0, paidOrders: 2, grossPaidRevenueUsd: 350.5, activeCampaigns: 0, revenuePartial: false });
    state.tables.admin_audit_logs!.push({ id: 1, action: "a", created_at: "2026-11-01" }, { id: 2, action: "b", created_at: "2026-11-02" });
    const log = await call("audit", "GET", admin);
    expect((log.body.items as Array<{ action: string }>).map((r) => r.action)).toEqual(["b", "a"]);
    expect((await call("audit", "GET", admin, undefined, "?action=Bad%20Value")).status).toBe(422);
  });

  it("validates payment filters", async () => {
    const support = user("support_agent");
    expect((await call("payments", "GET", support, undefined, "?status=finished")).status).toBe(200);
    expect((await call("payments", "GET", support, undefined, "?status=drop")).status).toBe(422);
    expect((await call("payments", "GET", support, undefined, "?limit=5000")).status).toBe(422);
  });
});
