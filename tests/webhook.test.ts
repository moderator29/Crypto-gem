import { beforeEach, describe, expect, it, vi } from "vitest";
import { signIpn } from "@/lib/payments/nowpayments";

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {};

/** Minimal in-memory stand-in for the Supabase query builder used by the webhook route. */
function fakeDb() {
  const from = (name: string) => {
    const filters: Array<[string, unknown]> = [];
    const preds: Array<(r: Row) => boolean> = [];
    let op: "select" | "update" = "select";
    let patch: Row = {};
    const match = () => (tables[name] ?? []).filter((r) => filters.every(([k, v]) => r[k] === v) && preds.every((p) => p(r)));
    const q = {
      select: () => q,
      eq: (k: string, v: unknown) => {
        filters.push([k, v]);
        return q;
      },
      gte: (k: string, v: string) => {
        preds.push((r) => String(r[k]) >= v);
        return q;
      },
      update: (p: Row) => {
        op = "update";
        patch = p;
        return q;
      },
      maybeSingle: async () => ({ data: match()[0] ?? null }),
      insert: async (row: Row) => {
        const t = (tables[name] ??= []);
        if (name === "payment_events" && t.some((r) => r.fingerprint === row.fingerprint)) return { error: { code: "23505" } };
        t.push(row);
        return { error: null };
      },
      then: (resolve: (v: unknown) => void) => {
        if (op === "update") match().forEach((r) => Object.assign(r, patch));
        resolve({ data: op === "select" ? match() : null, error: null });
      },
    };
    return q;
  };
  return { from };
}

vi.mock("@/lib/supabase/admin", () => ({ supabaseConfigured: () => true, supabaseAdmin: () => fakeDb() }));

const SECRET = "ipn-secret";
const base = { payment_id: 777, payment_status: "finished", order_id: "ord-1", price_amount: 300, price_currency: "usd", pay_currency: "usdtbsc", actually_paid: 300 };

async function post(body: object, sig?: string) {
  const { POST } = await import("@/app/api/webhooks/nowpayments/route");
  const req = new Request("http://x/api/webhooks/nowpayments", { method: "POST", body: JSON.stringify(body), headers: { "x-nowpayments-sig": sig ?? signIpn(body, SECRET) } });
  return POST(req);
}

beforeEach(() => {
  process.env.NOWPAYMENTS_IPN_SECRET = SECRET;
  tables.payments = [{ id: "pay-1", order_id: "ord-1", provider: "nowpayments", provider_payment_id: "777", pay_currency: "usdtbsc", pay_amount: 300, status: "waiting" }];
  tables.orders = [{ id: "ord-1", price_usd: 300, status: "pending", kind: "listing", ref_id: "sub-1" }];
  tables.token_submissions = [{ id: "sub-1", status: "awaiting_payment" }];
  tables.payment_events = [];
});

describe("boost activation through the webhook", () => {
  beforeEach(() => {
    tables.orders = [{ id: "ord-1", price_usd: 300, status: "pending", kind: "boost", ref_id: "boost-1" }];
    tables.boost_campaigns = [{ id: "boost-1", submission_id: "sub-9", pack_id: "spark", status: "awaiting_payment", starts_at: null, ends_at: null }];
    tables.boost_packs = [{ id: "spark", duration_hours: 6 }];
  });

  it("activates the boost with a server-computed window only after verified payment", async () => {
    await post({ ...base, payment_status: "confirming" });
    expect(tables.boost_campaigns?.[0]?.status).toBe("awaiting_payment");
    await post(base);
    const b = tables.boost_campaigns![0]!;
    expect(b.status).toBe("active");
    expect(Date.parse(String(b.ends_at)) - Date.parse(String(b.starts_at))).toBe(6 * 3_600_000);
  });

  it("queues behind a running boost for the same project", async () => {
    const end = new Date(Date.now() + 2 * 3_600_000).toISOString();
    tables.boost_campaigns!.push({ id: "boost-0", submission_id: "sub-9", pack_id: "spark", status: "active", starts_at: new Date().toISOString(), ends_at: end });
    await post(base);
    expect(tables.boost_campaigns?.[0]?.starts_at).toBe(end);
  });

  it("never activates on a replayed or underpaid payment", async () => {
    await post({ ...base, actually_paid: 5 });
    expect(tables.boost_campaigns?.[0]?.status).toBe("awaiting_payment");
  });
});

describe("NOWPayments webhook", () => {
  it("rejects a bad signature and changes nothing", async () => {
    const res = await post(base, "00".repeat(64));
    expect(res.status).toBe(401);
    expect(tables.orders?.[0]?.status).toBe("pending");
  });

  it("marks the order paid and moves the listing to review on a valid finished payment", async () => {
    const res = await post(base);
    expect(res.status).toBe(200);
    expect(tables.orders?.[0]?.status).toBe("paid");
    expect(tables.token_submissions?.[0]?.status).toBe("pending_review");
    expect(tables.payments?.[0]?.status).toBe("finished");
  });

  it("is idempotent: a replay does not re-apply", async () => {
    await post(base);
    tables.orders![0]!.status = "pending";
    const res = await post(base);
    expect(await res.text()).toBe("duplicate");
    expect(tables.orders?.[0]?.status).toBe("pending");
  });

  it("does not fulfil an underpaid finished payment", async () => {
    await post({ ...base, actually_paid: 10 });
    expect(tables.orders?.[0]?.status).toBe("pending");
    expect(tables.token_submissions?.[0]?.status).toBe("awaiting_payment");
  });

  it("does not fulfil a payment for a different order", async () => {
    await post({ ...base, order_id: "someone-else" });
    expect(tables.orders?.[0]?.status).toBe("pending");
  });

  it("does not fulfil from in-flight statuses", async () => {
    await post({ ...base, payment_status: "confirming", actually_paid: 300 });
    expect(tables.orders?.[0]?.status).toBe("pending");
    expect(tables.payments?.[0]?.status).toBe("confirming");
  });

  it("ignores unknown payments", async () => {
    const res = await post({ ...base, payment_id: 1 });
    expect(res.status).toBe(404);
  });
});
