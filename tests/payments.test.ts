import { describe, expect, it } from "vitest";
import { checkIpnAgainstOrder, mapStatus, signIpn, verifyIpn } from "@/lib/payments/nowpayments";

const secret = "test-secret";
const order = { orderId: "ord_1", providerPaymentId: "555", priceUsd: 300, payCurrency: "usdtbsc", payAmount: 300.5 };
const body = { payment_id: 555, payment_status: "finished", order_id: "ord_1", price_amount: 300, price_currency: "usd", pay_currency: "usdtbsc", actually_paid: 300.5 };

describe("NOWPayments IPN", () => {
  it("accepts a correct signature regardless of key order", () => {
    const sig = signIpn(body, secret);
    expect(verifyIpn(JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(body).reverse()))), sig, secret)).toBe(true);
  });
  it("rejects tampered bodies, bad signatures and missing secrets", () => {
    const sig = signIpn(body, secret);
    expect(verifyIpn({ ...body, actually_paid: 1 }, sig, secret)).toBe(false);
    expect(verifyIpn(body, "zz", secret)).toBe(false);
    expect(verifyIpn(body, null, secret)).toBe(false);
    expect(verifyIpn(body, sig, undefined)).toBe(false);
  });
  it("maps unknown statuses to created, never to paid", () => {
    expect(mapStatus("finished")).toBe("finished");
    expect(mapStatus("weird")).toBe("created");
    expect(mapStatus(undefined)).toBe("created");
  });
  it("validates the IPN against the order", () => {
    expect(checkIpnAgainstOrder(body, order)).toEqual({ ok: true, status: "finished" });
    expect(checkIpnAgainstOrder({ ...body, payment_id: 1 }, order).ok).toBe(false);
    expect(checkIpnAgainstOrder({ ...body, order_id: "other" }, order).ok).toBe(false);
    expect(checkIpnAgainstOrder({ ...body, pay_currency: "usdterc20" }, order).ok).toBe(false);
    expect(checkIpnAgainstOrder({ ...body, price_amount: 100 }, order).ok).toBe(false);
    expect(checkIpnAgainstOrder({ ...body, actually_paid: 10 }, order)).toEqual({ ok: false, reason: "underpaid" });
  });
  it("does not require full payment while still in flight", () => {
    expect(checkIpnAgainstOrder({ ...body, payment_status: "partially_paid", actually_paid: 10 }, order)).toEqual({ ok: true, status: "partially_paid" });
  });
});
