import { describe, expect, it } from "vitest";
import { fmtMultiple, fmtPct, fmtPrice, fmtUsd, parseList, parseNum } from "@/lib/tools/common";
import { dca, linearPath } from "@/lib/tools/dca";
import { ilCurve, ilForRatio, impermanentLoss } from "@/lib/tools/il";
import { marketCapWhatIf } from "@/lib/tools/marketcap";
import { profitAndLoss } from "@/lib/tools/pnl";
import { positionSize } from "@/lib/tools/position";
import { percentChange, recoveryGain } from "@/lib/tools/recovery";
import { TOOLS, toolBySlug } from "@/lib/tools/registry";

const ok = <T>(r: { ok: boolean; value?: T; errors?: string[] }): T => {
  expect(r.ok, JSON.stringify(r)).toBe(true);
  return r.value as T;
};

describe("number parsing", () => {
  it("parses plain, comma and decimal input", () => {
    expect(parseNum("1,234.5")).toBe(1234.5);
    expect(parseNum(" .5 ")).toBe(0.5);
    expect(parseNum("-3")).toBe(-3);
    expect(parseNum("1e3")).toBe(1000);
  });
  it("rejects empty, junk and non-finite input", () => {
    for (const bad of ["", "  ", "-", ".", "abc", "1.2.3", "NaN", "Infinity", "1e999", "12abc"]) expect(parseNum(bad)).toBeNull();
  });
  it("parses lists and rejects a list with a bad token", () => {
    expect(parseList("1, 2 3;4\n5")).toEqual([1, 2, 3, 4, 5]);
    expect(parseList("")).toEqual([]);
    expect(parseList("1, x")).toBeNull();
  });
  it("formats safely", () => {
    expect(fmtUsd(1234.5)).toBe("$1,234.50");
    expect(fmtUsd(-0.00001234)).toBe("-$0.00001234");
    expect(fmtUsd(0)).toBe("$0.00");
    expect(fmtUsd(1e20)).toContain("e+");
    expect(fmtUsd(NaN)).toBe("-");
    expect(fmtPct(12.345, true)).toBe("+12.35%");
    expect(fmtPct(-5)).toBe("-5.00%");
    expect(fmtPrice(0)).toBe("0");
    expect(fmtMultiple(2.5)).toBe("2.5x");
  });
});

describe("profit and loss", () => {
  it("computes a winning trade with fees", () => {
    const v = ok(profitAndLoss({ entry: 100, exit: 150, amount: 10, fees: 10 }));
    expect(v.cost).toBe(1000);
    expect(v.proceeds).toBe(1500);
    expect(v.pnl).toBe(490);
    expect(v.pct).toBeCloseTo(49, 6);
    expect(v.breakEven).toBeCloseTo(101, 6);
  });
  it("computes a losing trade and a total loss at zero exit", () => {
    expect(ok(profitAndLoss({ entry: 2, exit: 1, amount: 5, fees: null })).pct).toBeCloseTo(-50, 6);
    expect(ok(profitAndLoss({ entry: 2, exit: 0, amount: 5, fees: null })).pct).toBe(-100);
  });
  it("rejects zero, negative and missing values", () => {
    expect(profitAndLoss({ entry: 0, exit: 1, amount: 1, fees: 0 }).ok).toBe(false);
    expect(profitAndLoss({ entry: 1, exit: -1, amount: 1, fees: 0 }).ok).toBe(false);
    expect(profitAndLoss({ entry: 1, exit: 1, amount: 0, fees: 0 }).ok).toBe(false);
    expect(profitAndLoss({ entry: 1, exit: 1, amount: 1, fees: -2 }).ok).toBe(false);
    expect(profitAndLoss({ entry: null, exit: null, amount: null, fees: null }).ok).toBe(false);
  });
  it("rejects NaN and refuses numbers that overflow", () => {
    expect(profitAndLoss({ entry: NaN, exit: 1, amount: 1, fees: 0 }).ok).toBe(false);
    expect(profitAndLoss({ entry: 1e18, exit: 1e18, amount: 1e18, fees: 0 }).ok).toBe(true);
    expect(profitAndLoss({ entry: 1e30, exit: 1, amount: 1, fees: 0 }).ok).toBe(false);
  });
  it("handles a very small price", () => {
    const v = ok(profitAndLoss({ entry: 0.00000001, exit: 0.00000002, amount: 1e12, fees: 0 }));
    expect(v.pct).toBeCloseTo(100, 6);
  });
});

describe("position size", () => {
  it("sizes a long", () => {
    const v = ok(positionSize({ account: 10000, riskPct: 1, entry: 100, stop: 95, target: 115 }));
    expect(v.side).toBe("long");
    expect(v.riskAmount).toBe(100);
    expect(v.size).toBe(20);
    expect(v.positionValue).toBe(2000);
    expect(v.leverage).toBeCloseTo(0.2, 6);
    expect(v.rewardRisk).toBeCloseTo(3, 6);
    expect(v.rewardAmount).toBeCloseTo(300, 6);
    expect(v.stopDistancePct).toBeCloseTo(5, 6);
  });
  it("sizes a short and omits reward without a target", () => {
    const v = ok(positionSize({ account: 5000, riskPct: 2, entry: 50, stop: 55, target: null }));
    expect(v.side).toBe("short");
    expect(v.size).toBe(20);
    expect(v.rewardRisk).toBeNull();
  });
  it("flags leverage when the position is bigger than the account", () => {
    expect(ok(positionSize({ account: 1000, riskPct: 10, entry: 100, stop: 99, target: null })).leverage).toBeGreaterThan(1);
  });
  it("rejects bad risk, equal stop and wrong-side targets", () => {
    expect(positionSize({ account: 1000, riskPct: 0, entry: 1, stop: 0.5, target: null }).ok).toBe(false);
    expect(positionSize({ account: 1000, riskPct: 101, entry: 1, stop: 0.5, target: null }).ok).toBe(false);
    expect(positionSize({ account: 1000, riskPct: 1, entry: 1, stop: 1, target: null }).ok).toBe(false);
    expect(positionSize({ account: 1000, riskPct: 1, entry: 10, stop: 9, target: 8 }).ok).toBe(false);
    expect(positionSize({ account: 1000, riskPct: 1, entry: 10, stop: 11, target: 12 }).ok).toBe(false);
    expect(positionSize({ account: -5, riskPct: 1, entry: 10, stop: 9, target: null }).ok).toBe(false);
    expect(positionSize({ account: NaN, riskPct: 1, entry: 10, stop: 9, target: null }).ok).toBe(false);
  });
});

describe("dca", () => {
  it("averages cost on a typed price list", () => {
    const v = ok(dca({ mode: "list", amount: 100, prices: "10, 5, 20" }));
    expect(v.totalSpent).toBe(300);
    expect(v.totalUnits).toBeCloseTo(10 + 20 + 5, 9);
    expect(v.avgCost).toBeCloseTo(300 / 35, 9);
    expect(v.currentValue).toBeCloseTo(35 * 20, 9);
    expect(v.rows).toHaveLength(3);
    expect(v.lumpUnits).toBeCloseTo(30, 9);
  });
  it("builds a linear path with both ends", () => {
    expect(linearPath(10, 20, 3)).toEqual([10, 15, 20]);
    expect(linearPath(10, 20, 1)).toEqual([10]);
    const v = ok(dca({ mode: "linear", amount: 50, count: 4, start: 100, end: 40 }));
    expect(v.rows.map((r) => r.price)).toEqual([100, 80, 60, 40]);
    expect(v.pnl).toBeLessThan(0);
  });
  it("validates inputs", () => {
    expect(dca({ mode: "list", amount: 100, prices: "" }).ok).toBe(false);
    expect(dca({ mode: "list", amount: 100, prices: "1, abc" }).ok).toBe(false);
    expect(dca({ mode: "list", amount: 100, prices: "1, 0" }).ok).toBe(false);
    expect(dca({ mode: "list", amount: 100, prices: "1, -2" }).ok).toBe(false);
    expect(dca({ mode: "list", amount: 0, prices: "1" }).ok).toBe(false);
    expect(dca({ mode: "linear", amount: 10, count: 0, start: 1, end: 2 }).ok).toBe(false);
    expect(dca({ mode: "linear", amount: 10, count: 2.5, start: 1, end: 2 }).ok).toBe(false);
    expect(dca({ mode: "linear", amount: 10, count: 9999, start: 1, end: 2 }).ok).toBe(false);
    expect(dca({ mode: "linear", amount: 10, count: 3, start: NaN, end: 2 }).ok).toBe(false);
    expect(dca({ mode: "list", amount: 10, prices: Array.from({ length: 600 }, () => "1").join(" ") }).ok).toBe(false);
  });
});

describe("market cap what-if", () => {
  it("scales price by the multiple", () => {
    const v = ok(marketCapWhatIf({ price: 0.5, current: 5_000_000, target: 50_000_000 }));
    expect(v.multiple).toBe(10);
    expect(v.impliedPrice).toBe(5);
    expect(v.impliedSupply).toBe(10_000_000);
    expect(v.changePct).toBe(900);
  });
  it("supports a lower target", () => {
    expect(ok(marketCapWhatIf({ price: 2, current: 100, target: 25 })).impliedPrice).toBe(0.5);
  });
  it("rejects zero, negative and NaN", () => {
    expect(marketCapWhatIf({ price: 0, current: 1, target: 1 }).ok).toBe(false);
    expect(marketCapWhatIf({ price: 1, current: -1, target: 1 }).ok).toBe(false);
    expect(marketCapWhatIf({ price: 1, current: 1, target: NaN }).ok).toBe(false);
  });
  it("handles huge market caps", () => {
    expect(ok(marketCapWhatIf({ price: 1, current: 1e12, target: 1e15 })).multiple).toBe(1000);
  });
});

describe("percent change and recovery", () => {
  it("measures a move and the move back", () => {
    const v = ok(percentChange(100, 50));
    expect(v.changePct).toBe(-50);
    expect(v.recoverPct).toBe(100);
    expect(ok(percentChange(100, 0)).recoverPct).toBeNull();
    expect(percentChange(0, 1).ok).toBe(false);
    expect(percentChange(1, -1).ok).toBe(false);
    expect(percentChange(NaN, 1).ok).toBe(false);
  });
  it("computes the gain needed after a loss", () => {
    expect(ok(recoveryGain(50)).gainNeededPct).toBeCloseTo(100, 9);
    expect(ok(recoveryGain(90)).gainNeededPct).toBeCloseTo(900, 9);
    expect(ok(recoveryGain(10)).gainNeededPct).toBeCloseTo(11.111111, 5);
    expect(ok(recoveryGain(99.9)).gainNeededPct).toBeGreaterThan(99000);
  });
  it("rejects zero, full and impossible losses", () => {
    expect(recoveryGain(0).ok).toBe(false);
    expect(recoveryGain(-5).ok).toBe(false);
    expect(recoveryGain(100).ok).toBe(false);
    expect(recoveryGain(250).ok).toBe(false);
    expect(recoveryGain(null).ok).toBe(false);
    expect(recoveryGain(NaN).ok).toBe(false);
  });
});

describe("impermanent loss", () => {
  it("matches the textbook values", () => {
    expect(ilForRatio(1)).toBeCloseTo(0, 12);
    expect(ilForRatio(2)).toBeCloseTo(-5.719, 2);
    expect(ilForRatio(4)).toBeCloseTo(-20, 6);
    expect(ilForRatio(0.5)).toBeCloseTo(ilForRatio(2), 9);
  });
  it("is symmetric between a rise and the matching fall", () => {
    expect(ilForRatio(5)).toBeCloseTo(ilForRatio(1 / 5), 9);
  });
  it("shows the money difference for a deposit", () => {
    const v = ok(impermanentLoss(300, 1000));
    expect(v.ratio).toBe(4);
    expect(v.holdValue).toBeCloseTo(2500, 6);
    expect(v.poolValue).toBeCloseTo(2000, 6);
    expect(v.lostValue).toBeCloseTo(500, 6);
  });
  it("works without a deposit and at zero change", () => {
    const v = ok(impermanentLoss(0, null));
    expect(Math.abs(v.ilPct)).toBeLessThan(1e-9);
    expect(v.poolValue).toBeNull();
  });
  it("rejects impossible input", () => {
    expect(impermanentLoss(-100, null).ok).toBe(false);
    expect(impermanentLoss(-250, null).ok).toBe(false);
    expect(impermanentLoss(NaN, null).ok).toBe(false);
    expect(impermanentLoss(10, 0).ok).toBe(false);
    expect(impermanentLoss(10, -3).ok).toBe(false);
  });
  it("handles a huge move without NaN", () => {
    const v = ok(impermanentLoss(1e9, null));
    expect(v.ilPct).toBeLessThan(0);
    expect(v.ilPct).toBeGreaterThan(-100);
  });
  it("builds a curve that peaks at no change", () => {
    const c = ilCurve(10, 48);
    expect(c).toHaveLength(49);
    expect(c.every((p) => Number.isFinite(p.ilPct) && p.ilPct <= 1e-9)).toBe(true);
    expect(c[24]!.ilPct).toBeCloseTo(0, 9);
  });
});

describe("registry", () => {
  it("has six tools with unique slugs", () => {
    expect(TOOLS).toHaveLength(6);
    expect(new Set(TOOLS.map((t) => t.slug)).size).toBe(6);
    expect(toolBySlug("dca")?.title).toBe("DCA calculator");
    expect(toolBySlug("nope")).toBeUndefined();
  });
});
