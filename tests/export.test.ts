import { describe, expect, it } from "vitest";
import { csvCell, csvFileName, toCsv } from "@/lib/export/csv";
import { cropPercent, evaluateCreative, safeInset } from "@/lib/export/creativeCheck";
import { checkCreative } from "@/lib/ads/image";
import { boostPhase, completion, dayGroup, listingJourney, nextSteps, timeLeft } from "@/components/dashboard/logic";
import type { Overview } from "@/components/dashboard/DashboardProvider";

describe("csv", () => {
  it("leaves plain text alone and quotes commas, quotes and newlines", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell("a\r\nb")).toBe('"a\r\nb"');
  });
  it("guards formula injection on text only", () => {
    for (const s of ["=SUM(A1)", "+1", "-1", "@cmd", "\tx"]) expect(csvCell(s).startsWith("'") || csvCell(s).startsWith("\"'")).toBe(true);
    expect(csvCell("=1,2")).toBe("\"'=1,2\"");
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell(0.0001)).toBe("0.0001");
  });
  it("renders empty values as empty cells", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(true)).toBe("true");
  });
  it("builds rows with CRLF and a header", () => {
    expect(toCsv(["a", "b"], [[1, "x,y"], [null, "z"]])).toBe('a,b\r\n1,"x,y"\r\n,z\r\n');
  });
  it("makes safe file names", () => {
    expect(csvFileName("Dashboard Watchlist!", new Date("2026-03-04T10:00:00Z"))).toBe("dashboard-watchlist-2026-03-04.csv");
    expect(csvFileName("///", new Date("2026-03-04T10:00:00Z"))).toBe("export-2026-03-04.csv");
  });
});

describe("creative check", () => {
  const rec = { w: 1200, h: 300 };
  const ids = (r: ReturnType<typeof evaluateCreative>) => Object.fromEntries(r.items.map((i) => [i.id, i.level]));
  it("passes an exact match", () => {
    const r = evaluateCreative({ kind: "png", bytes: 200_000, width: 1200, height: 300 }, rec);
    expect(r.ok).toBe(true);
    expect(Object.values(ids(r))).toEqual(["pass", "pass", "pass", "pass"]);
  });
  it("warns on small, heavy and slightly off-shape images", () => {
    const r = evaluateCreative({ kind: "jpeg", bytes: 1_700_000, width: 900, height: 240 }, rec);
    expect(r.ok).toBe(true);
    expect(ids(r)).toMatchObject({ size: "warn", dimensions: "warn", shape: "warn" });
  });
  it("fails the same cases the server refuses", () => {
    expect(evaluateCreative({ kind: null, bytes: 10, width: 0, height: 0 }, rec).ok).toBe(false);
    expect(evaluateCreative({ kind: "png", bytes: 3 * 1024 * 1024, width: 1200, height: 300 }, rec).ok).toBe(false);
    expect(evaluateCreative({ kind: "png", bytes: 1000, width: 500, height: 125 }, rec).ok).toBe(false);
    expect(evaluateCreative({ kind: "png", bytes: 1000, width: 1200, height: 600 }, rec).ok).toBe(false);
  });
  it("agrees with the server check on pass or fail", () => {
    const cases = [
      { kind: "png" as const, bytes: 1000, width: 1200, height: 300 },
      { kind: "png" as const, bytes: 1000, width: 599, height: 150 },
      { kind: "webp" as const, bytes: 1000, width: 1200, height: 340 },
      { kind: "webp" as const, bytes: 1000, width: 1200, height: 380 },
    ];
    for (const c of cases) expect(evaluateCreative(c, rec).ok).toBe(checkCreative({ kind: c.kind, width: c.width, height: c.height }, c.bytes, rec).ok);
  });
  it("computes crop and safe area", () => {
    expect(cropPercent(1200, 300, rec)).toBe(0);
    expect(cropPercent(1200, 600, rec)).toBe(50);
    expect(safeInset({ w: 1200, h: 300 }).x).toBeGreaterThan(0);
  });
});

describe("listing journey", () => {
  const states = (s: string, r: string | null = null) => listingJourney(s, r).map((x) => x.state);
  it("walks forward through the real statuses", () => {
    expect(states("awaiting_payment")).toEqual(["done", "active", "todo", "todo", "todo"]);
    expect(states("pending_review")).toEqual(["done", "done", "active", "todo", "todo"]);
    expect(states("approved")).toEqual(["done", "done", "done", "active", "todo"]);
    expect(states("published")).toEqual(["done", "done", "done", "done", "done"]);
  });
  it("marks rejection and requested changes honestly with the reason", () => {
    const j = listingJourney("rejected", "Logo is not yours");
    expect(j[2]).toMatchObject({ state: "blocked", label: "Rejected", note: "Logo is not yours" });
    expect(listingJourney("draft", null)[2]).toMatchObject({ state: "blocked", label: "Changes requested" });
    expect(listingJourney("suspended", "Policy")[4]?.state).toBe("blocked");
  });
});

describe("boost timing", () => {
  const now = Date.parse("2026-05-01T12:00:00Z");
  it("classifies phases from the clock", () => {
    expect(boostPhase({ status: "active", starts_at: "2026-05-01T00:00:00Z", ends_at: "2026-05-02T00:00:00Z" }, now)).toBe("running");
    expect(boostPhase({ status: "active", starts_at: "2026-05-01T00:00:00Z", ends_at: "2026-05-01T11:00:00Z" }, now)).toBe("ended");
    expect(boostPhase({ status: "scheduled", starts_at: "2026-05-03T00:00:00Z", ends_at: "2026-05-04T00:00:00Z" }, now)).toBe("queued");
    expect(boostPhase({ status: "completed", starts_at: null, ends_at: null }, now)).toBe("ended");
  });
  it("reports time left and the remaining fraction", () => {
    const t = timeLeft("2026-05-01T00:00:00Z", "2026-05-02T00:00:00Z", now);
    expect(t?.fraction).toBeCloseTo(0.5);
    expect(t?.label).toBe("12:00:00");
    expect(timeLeft(null, "2026-05-04T13:30:00Z", now)?.label).toBe("3d 01h 30m");
    expect(timeLeft(null, "2026-05-01T11:00:00Z", now)?.ms).toBe(0);
    expect(timeLeft(null, null, now)).toBeNull();
  });
});

describe("setup checklist", () => {
  const empty: Overview = { email: null, submissions: [], orders: [], boosts: [], campaigns: [] };
  it("starts empty and counts real rows", () => {
    expect(completion(nextSteps(empty, [], 0))).toBe(0);
    const full: Overview = { ...empty, submissions: [{ id: "1", name: "A", symbol: "A", network_id: null, address: null, status: "published", rejection_reason: null, created_at: "2026-01-01T00:00:00Z" }], boosts: [{ id: "b", projectName: null, pack_id: "spark", status: "active", starts_at: null, ends_at: null }] };
    expect(completion(nextSteps(full, [], 0))).toBe(50);
  });
  it("does not count an unknown alert total as done", () => {
    expect(nextSteps(empty, [], null).find((s) => s.key === "alert")?.done).toBeNull();
  });
});

describe("day groups", () => {
  const now = new Date(2026, 4, 10, 15, 0, 0);
  it("buckets by local calendar day", () => {
    expect(dayGroup(new Date(2026, 4, 10, 1, 0).toISOString(), now)).toBe("Today");
    expect(dayGroup(new Date(2026, 4, 9, 23, 0).toISOString(), now)).toBe("Yesterday");
    expect(dayGroup(new Date(2026, 4, 1, 12, 0).toISOString(), now)).toBe("Earlier");
    expect(dayGroup("nope", now)).toBe("Earlier");
  });
});
