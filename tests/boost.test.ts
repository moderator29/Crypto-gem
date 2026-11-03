import { describe, expect, it } from "vitest";
import { boostWindow } from "@/lib/boost";

const now = new Date("2026-12-01T10:00:00Z");

describe("boostWindow", () => {
  it("starts now with no existing boost", () => {
    const w = boostWindow(6, [], now);
    expect(w.startsAt.toISOString()).toBe("2026-12-01T10:00:00.000Z");
    expect(w.endsAt.toISOString()).toBe("2026-12-01T16:00:00.000Z");
  });
  it("queues after a running boost instead of overlapping", () => {
    const w = boostWindow(24, [{ ends_at: "2026-12-01T14:00:00Z" }], now);
    expect(w.startsAt.toISOString()).toBe("2026-12-01T14:00:00.000Z");
    expect(w.endsAt.toISOString()).toBe("2026-12-02T14:00:00.000Z");
  });
  it("ignores boosts that already ended", () => {
    expect(boostWindow(6, [{ ends_at: "2026-11-30T00:00:00Z" }], now).startsAt.toISOString()).toBe("2026-12-01T10:00:00.000Z");
  });
});
