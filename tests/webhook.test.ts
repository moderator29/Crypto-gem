import { beforeEach, describe, expect, it, vi } from "vitest";
import { signIpn } from "@/lib/payments/nowpayments";

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {};

/** Minimal in-memory stand-in for the Supabase query builder used by the webhook route. */
function fakeDb() {
  const from = (name: string) => {
    const filters: Array<[string, unknown]> = [];
    let op: "select" | "update" = "select";
    let patch: Row = {};
    const match = () => (tables[name] ?? []).filter((r) => filters.every(([k, v]) => r[k] === v));
    const q = {
      select: () => q,
      eq: (k: string, v: unknown) => {
        filters.push([k, v]);
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
        resolve({ data: null, error: null });
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
