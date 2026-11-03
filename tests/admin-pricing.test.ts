import { describe, expect, it } from "vitest";
import { priceUpdate } from "@/lib/admin/pricing";

const ok = (v: unknown) => priceUpdate.safeParse(v).success;

describe("pricing validation", () => {
  it("accepts sane updates for each table", () => {
    expect(ok({ table: "listing_packages", id: "starter", patch: { price_usd: 350 } })).toBe(true);
    expect(ok({ table: "listing_packages", id: "pro", patch: { price_usd: 699.99, active: false, duration_days: null } })).toBe(true);
    expect(ok({ table: "boost_packs", id: "spark", patch: { price_usd: 30, credits: 60, duration_hours: 6, label: null } })).toBe(true);
    expect(ok({ table: "advertising_placements", id: "hero", patch: { prices: { "1": 350, "3": 945, "7": 1540 }, slots: 5 } })).toBe(true);
  });

  it("rejects negative, non-finite, oversized and over-precise prices", () => {
    for (const price_usd of [-1, Number.NaN, Infinity, 100_001, 10.123, "300", null]) {
      expect(ok({ table: "listing_packages", id: "starter", patch: { price_usd } }), String(price_usd)).toBe(false);
    }
  });

  it("rejects empty patches, unknown fields and bad ids", () => {
    expect(ok({ table: "listing_packages", id: "starter", patch: {} })).toBe(false);
    expect(ok({ table: "listing_packages", id: "starter", patch: { price_usd: 1, secret: true } })).toBe(false);
    expect(ok({ table: "listing_packages", id: "Starter; drop table", patch: { price_usd: 1 } })).toBe(false);
    expect(ok({ table: "orders", id: "x", patch: { price_usd: 1 } })).toBe(false);
  });

  it("validates integers and placement price maps", () => {
    expect(ok({ table: "boost_packs", id: "spark", patch: { credits: 0 } })).toBe(false);
    expect(ok({ table: "boost_packs", id: "spark", patch: { duration_hours: 1.5 } })).toBe(false);
    expect(ok({ table: "advertising_placements", id: "hero", patch: { prices: {} } })).toBe(false);
    expect(ok({ table: "advertising_placements", id: "hero", patch: { prices: { "0": 10 } } })).toBe(false);
    expect(ok({ table: "advertising_placements", id: "hero", patch: { prices: { week: 10 } } })).toBe(false);
    expect(ok({ table: "advertising_placements", id: "hero", patch: { prices: { "1": -5 } } })).toBe(false);
    expect(ok({ table: "advertising_placements", id: "hero", patch: { slots: 0 } })).toBe(false);
  });
});
