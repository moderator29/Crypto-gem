import { describe, expect, it } from "vitest";
import { allocate, priceFor } from "@/lib/ads/availability";
import { checkCreative, inspectImage } from "@/lib/ads/image";
import { dedupeKey, deviceOf, isBot } from "@/lib/ads/track";

const day = 86_400_000;
const t0 = Date.UTC(2026, 11, 1);

describe("allocate", () => {
  it("never double-sells an exclusive slot and hands out the next free slot", () => {
    const rule = { slots: 2, exclusive: true };
    const existing = [{ start: t0, end: t0 + 3 * day, slot: 1 }];
    expect(allocate(rule, existing, { start: t0 + day, end: t0 + 2 * day })).toEqual({ ok: true, slot: 2 });
    expect(allocate(rule, [...existing, { start: t0, end: t0 + 3 * day, slot: 2 }], { start: t0 + day, end: t0 + 2 * day }).ok).toBe(false);
  });
  it("allows adjacent windows", () => {
    expect(allocate({ slots: 1, exclusive: true }, [{ start: t0, end: t0 + day, slot: 1 }], { start: t0 + day, end: t0 + 2 * day })).toEqual({ ok: true, slot: 1 });
  });
  it("caps shared placements by peak concurrency, not by count of overlaps", () => {
    const rule = { slots: 2, exclusive: false };
    const existing = [{ start: t0, end: t0 + day, slot: null }, { start: t0 + day, end: t0 + 2 * day, slot: null }];
    expect(allocate(rule, existing, { start: t0, end: t0 + 2 * day }).ok).toBe(true);
    expect(allocate(rule, [...existing, { start: t0, end: t0 + 2 * day, slot: null }], { start: t0, end: t0 + 2 * day }).ok).toBe(false);
    expect(allocate(rule, [{ start: t0, end: t0 + 2 * day, slot: null }, { start: t0, end: t0 + 2 * day, slot: null }], { start: t0, end: t0 + day }).ok).toBe(false);
  });
  it("rejects inverted dates and unpriced durations", () => {
    expect(allocate({ slots: 1, exclusive: false }, [], { start: t0, end: t0 }).ok).toBe(false);
    expect(priceFor({ "1": 350, "3": 945 }, 7)).toBeNull();
    expect(priceFor({ "1": 350 }, 1)).toBe(350);
  });
});

function png(w: number, h: number) {
  const b = new Uint8Array(32);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const dv = new DataView(b.buffer);
  dv.setUint32(16, w);
  dv.setUint32(20, h);
  return b;
}

describe("creative validation", () => {
  it("reads dimensions from bytes and rejects non-images", () => {
    expect(inspectImage(png(1600, 500))).toEqual({ kind: "png", width: 1600, height: 500 });
    expect(inspectImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
  it("enforces shape, size and minimum width", () => {
    const rec = { w: 1600, h: 500 };
    expect(checkCreative(inspectImage(png(1600, 500)), 1000, rec).ok).toBe(true);
    expect(checkCreative(inspectImage(png(1000, 1000)), 1000, rec).ok).toBe(false);
    expect(checkCreative(inspectImage(png(400, 125)), 1000, rec).ok).toBe(false);
    expect(checkCreative(inspectImage(png(1600, 500)), 5 * 1024 * 1024, rec).ok).toBe(false);
    expect(checkCreative(null, 1, rec).ok).toBe(false);
  });
});

describe("tracking", () => {
  it("filters bots and classifies devices", () => {
    expect(isBot(null)).toBe(true);
    expect(isBot("Googlebot/2.1")).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17) AppleWebKit Safari")).toBe(false);
    expect(deviceOf("Mozilla/5.0 (iPhone)")).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (Windows NT 10.0)")).toBe("desktop");
  });
  it("dedupes per visitor per hour and separates visitors", () => {
    const a = new Date("2026-12-01T10:05:00Z");
    expect(dedupeKey("impression", "1.1.1.1", "ua", a)).toBe(dedupeKey("impression", "1.1.1.1", "ua", new Date("2026-12-01T10:55:00Z")));
    expect(dedupeKey("impression", "1.1.1.1", "ua", a)).not.toBe(dedupeKey("impression", "1.1.1.2", "ua", a));
    expect(dedupeKey("impression", "1.1.1.1", "ua", a)).not.toBe(dedupeKey("click", "1.1.1.1", "ua", a));
    expect(dedupeKey("impression", "1.1.1.1", "ua", a)).not.toBe(dedupeKey("impression", "1.1.1.1", "ua", new Date("2026-12-01T11:00:00Z")));
  });
});
