import { describe, expect, it } from "vitest";
import { fmtMultiple, fmtPct, fmtPrice, fmtUsd, parseList, parseNum } from "@/lib/tools/common";
import { dca, linearPath } from "@/lib/tools/dca";
import { ilCurve, ilForRatio, impermanentLoss } from "@/lib/tools/il";
import { marketCapWhatIf } from "@/lib/tools/marketcap";
import { profitAndLoss } from "@/lib/tools/pnl";
import { positionSize } from "@/lib/tools/position";
import { percentChange, recoveryGain } from "@/lib/tools/recovery";
import { tradeCost } from "@/lib/tools/costs";
import { liquidation, liquidationPrice, priceLadder } from "@/lib/tools/liquidation";
import { TOOLS, toolBySlug } from "@/lib/tools/registry";
import { TOOL_SPECS } from "@/lib/tools/specs";
import { apyFromApr, compoundValue, staking } from "@/lib/tools/staking";
import { summarize } from "@/lib/tools/summaries";
import { vesting } from "@/lib/tools/vesting";

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
  it("has ten tools with unique slugs and a share spec for each", () => {
    expect(TOOLS).toHaveLength(10);
    expect(new Set(TOOLS.map((t) => t.slug)).size).toBe(10);
    for (const t of TOOLS) expect(Object.keys(TOOL_SPECS[t.slug] ?? {}).length, t.slug).toBeGreaterThan(0);
    expect(toolBySlug("dca")?.title).toBe("DCA calculator");
    expect(toolBySlug("nope")).toBeUndefined();
  });
});

describe("token vesting", () => {
  it("releases linearly after a cliff and ends at the total", () => {
    const v = ok(vesting({ total: 1200, cliff: 6, linear: 12, tgePct: null }));
    expect(v.totalMonths).toBe(18);
    expect(v.rows).toHaveLength(19);
    expect(v.rows[0]!.released).toBe(0);
    expect(v.rows[6]!.released).toBe(0);
    expect(v.rows[7]!.released).toBeCloseTo(100, 9);
    expect(v.rows[12]!.released).toBeCloseTo(600, 9);
    expect(v.rows[18]!.released).toBe(1200);
    expect(v.rows[18]!.locked).toBe(0);
    expect(v.perMonth).toBeCloseTo(100, 9);
    expect(v.firstUnlockMonth).toBe(7);
  });
  it("honours an unlocked-at-start share and keeps released plus locked equal to the total", () => {
    const v = ok(vesting({ total: 1000, cliff: 3, linear: 4, tgePct: 10 }));
    expect(v.atStart).toBe(100);
    expect(v.rows[0]!.released).toBe(100);
    expect(v.rows[3]!.released).toBe(100);
    for (const r of v.rows) expect(r.released + r.locked).toBeCloseTo(1000, 9);
    const sum = v.rows.reduce((n, r, i) => (i === 0 ? n : n + r.unlocked), 0);
    expect(sum).toBeCloseTo(900, 9);
  });
  it("unlocks everything at the cliff when there is no linear period", () => {
    const v = ok(vesting({ total: 500, cliff: 12, linear: 0, tgePct: null }));
    expect(v.rows[11]!.released).toBe(0);
    expect(v.rows[12]!.released).toBe(500);
    expect(v.perMonth).toBe(0);
  });
  it("rejects zero, negative, fractional, huge and NaN input", () => {
    expect(vesting({ total: 0, cliff: 1, linear: 1, tgePct: null }).ok).toBe(false);
    expect(vesting({ total: -5, cliff: 1, linear: 1, tgePct: null }).ok).toBe(false);
    expect(vesting({ total: 10, cliff: 0, linear: 0, tgePct: null }).ok).toBe(false);
    expect(vesting({ total: 10, cliff: -1, linear: 4, tgePct: null }).ok).toBe(false);
    expect(vesting({ total: 10, cliff: 1.5, linear: 4, tgePct: null }).ok).toBe(false);
    expect(vesting({ total: 10, cliff: 200, linear: 100, tgePct: null }).ok).toBe(false);
    expect(vesting({ total: 10, cliff: 1, linear: 4, tgePct: 101 }).ok).toBe(false);
    expect(vesting({ total: NaN, cliff: 1, linear: 4, tgePct: null }).ok).toBe(false);
    expect(vesting({ total: 1e30, cliff: 1, linear: 4, tgePct: null }).ok).toBe(false);
  });
  it("handles a very large grant", () => {
    expect(ok(vesting({ total: 1e18, cliff: 1, linear: 1, tgePct: null })).rows[2]!.released).toBe(1e18);
  });
});

describe("staking and compounding", () => {
  it("matches known compounding values", () => {
    expect(compoundValue(1000, 12, 12, 1)).toBeCloseTo(1126.8250301319698, 9);
    expect(apyFromApr(12, 12)).toBeCloseTo(12.682503013196973, 9);
    expect(apyFromApr(10, 1)).toBeCloseTo(10, 9);
  });
  it("compares simple and compound growth", () => {
    const v = ok(staking({ principal: 1000, aprPct: 10, perYear: 1, years: 3 }));
    expect(v.simpleFinal).toBeCloseTo(1300, 9);
    expect(v.compoundFinal).toBeCloseTo(1331, 9);
    expect(v.extraFromCompounding).toBeCloseTo(31, 9);
    expect(v.curve).toHaveLength(49);
    expect(v.curve[0]!.compound).toBe(1000);
    expect(v.yearly.map((p) => p.year)).toEqual([1, 2, 3]);
  });
  it("adds a final partial year row", () => {
    expect(ok(staking({ principal: 100, aprPct: 5, perYear: 12, years: 2.5 })).yearly.map((p) => p.year)).toEqual([1, 2, 2.5]);
  });
  it("gives equal results at 0% APR", () => {
    const v = ok(staking({ principal: 500, aprPct: 0, perYear: 365, years: 10 }));
    expect(v.compoundFinal).toBe(500);
    expect(v.simpleFinal).toBe(500);
    expect(v.apyPct).toBe(0);
  });
  it("rejects bad input and overflow", () => {
    expect(staking({ principal: 0, aprPct: 5, perYear: 12, years: 1 }).ok).toBe(false);
    expect(staking({ principal: -1, aprPct: 5, perYear: 12, years: 1 }).ok).toBe(false);
    expect(staking({ principal: 1, aprPct: -5, perYear: 12, years: 1 }).ok).toBe(false);
    expect(staking({ principal: 1, aprPct: 5, perYear: 7, years: 1 }).ok).toBe(false);
    expect(staking({ principal: 1, aprPct: 5, perYear: null, years: 1 }).ok).toBe(false);
    expect(staking({ principal: 1, aprPct: 5, perYear: 12, years: 0 }).ok).toBe(false);
    expect(staking({ principal: 1, aprPct: 5, perYear: 12, years: 101 }).ok).toBe(false);
    expect(staking({ principal: NaN, aprPct: 5, perYear: 12, years: 1 }).ok).toBe(false);
    expect(staking({ principal: 1, aprPct: 1000, perYear: 365, years: 100 }).ok).toBe(false);
  });
  it("handles a huge principal", () => {
    expect(ok(staking({ principal: 1e18, aprPct: 5, perYear: 1, years: 1 })).compoundFinal).toBeCloseTo(1.05e18, -5);
  });
});

describe("liquidation price", () => {
  it("computes a long and a short", () => {
    expect(liquidationPrice("long", 100, 10, 0)).toBeCloseTo(90, 9);
    expect(liquidationPrice("short", 100, 10, 0)).toBeCloseTo(110, 9);
    expect(liquidationPrice("long", 100, 10, 0.5)).toBeCloseTo(90 / 0.995, 9);
    expect(liquidationPrice("short", 100, 10, 0.5)).toBeCloseTo(110 / 1.005, 9);
  });
  it("reports distance, starting margin and margin figures", () => {
    const v = ok(liquidation({ side: "long", entry: 100, leverage: 10, mmrPct: 0.5, margin: 1000 }));
    expect(v.liqPrice).toBeCloseTo(90 / 0.995, 9);
    expect(v.distancePct).toBeCloseTo(((100 - 90 / 0.995) / 100) * 100, 9);
    expect(v.initialMarginPct).toBe(10);
    expect(v.notional).toBe(10000);
    expect(v.quantity).toBe(100);
    expect(v.marginLost).toBeCloseTo(1000 - 0.005 * (90 / 0.995) * 100, 9);
  });
  it("has no liquidation above zero at 1x for a long", () => {
    expect(ok(liquidation({ side: "long", entry: 50, leverage: 1, mmrPct: 0.5, margin: null })).liqPrice).toBe(0);
    expect(ok(liquidation({ side: "short", entry: 50, leverage: 1, mmrPct: 0, margin: null })).liqPrice).toBeCloseTo(100, 9);
  });
  it("moves closer as leverage rises", () => {
    const lo = ok(liquidation({ side: "long", entry: 100, leverage: 3, mmrPct: 0.5, margin: null })).distancePct;
    const hi = ok(liquidation({ side: "long", entry: 100, leverage: 50, mmrPct: 0.5, margin: null })).distancePct;
    expect(hi).toBeLessThan(lo);
  });
  it("rejects bad input and positions that open underwater", () => {
    expect(liquidation({ side: "long", entry: 0, leverage: 5, mmrPct: 0.5, margin: null }).ok).toBe(false);
    expect(liquidation({ side: "long", entry: -1, leverage: 5, mmrPct: 0.5, margin: null }).ok).toBe(false);
    expect(liquidation({ side: "long", entry: 1, leverage: 0.5, mmrPct: 0.5, margin: null }).ok).toBe(false);
    expect(liquidation({ side: "long", entry: 1, leverage: 5000, mmrPct: 0.5, margin: null }).ok).toBe(false);
    expect(liquidation({ side: "sideways", entry: 1, leverage: 5, mmrPct: 0.5, margin: null }).ok).toBe(false);
    expect(liquidation({ side: null, entry: 1, leverage: 5, mmrPct: 0.5, margin: null }).ok).toBe(false);
    expect(liquidation({ side: "long", entry: 1, leverage: 5, mmrPct: -1, margin: null }).ok).toBe(false);
    expect(liquidation({ side: "long", entry: 1, leverage: 5, mmrPct: 50, margin: null }).ok).toBe(false);
    expect(liquidation({ side: "long", entry: 1, leverage: 5, mmrPct: 0.5, margin: 0 }).ok).toBe(false);
    expect(liquidation({ side: "long", entry: NaN, leverage: 5, mmrPct: 0.5, margin: null }).ok).toBe(false);
    expect(liquidation({ side: "long", entry: 1, leverage: 100, mmrPct: 1, margin: null }).ok).toBe(false);
    expect(liquidation({ side: "long", entry: 1, leverage: 200, mmrPct: 2, margin: null }).ok).toBe(false);
  });
  it("handles huge prices", () => {
    expect(ok(liquidation({ side: "short", entry: 1e18, leverage: 2, mmrPct: 0.5, margin: null })).liqPrice).toBeGreaterThan(1e18);
  });
  it("builds a sorted ladder with the entry and liquidation marked", () => {
    const liq = liquidationPrice("long", 100, 10, 0.5);
    const rungs = priceLadder("long", 100, liq);
    expect(rungs.filter((r) => r.kind === "entry")).toHaveLength(1);
    expect(rungs.filter((r) => r.kind === "liq")).toHaveLength(1);
    expect(rungs.map((r) => r.price)).toEqual([...rungs.map((r) => r.price)].sort((a, b) => b - a));
    expect(rungs.every((r) => Number.isFinite(r.price) && r.price >= 0)).toBe(true);
    const shortRungs = priceLadder("short", 100, liquidationPrice("short", 100, 2, 0.5));
    expect(shortRungs.every((r) => r.price > 0)).toBe(true);
    expect(shortRungs[0]!.kind).toBe("liq");
  });
});

describe("fee and slippage cost", () => {
  it("adds fee, impact and network cost", () => {
    const v = ok(tradeCost({ size: 1000, feePct: 0.3, impactPct: 1, networkUsd: 2 }));
    expect(v.feeUsd).toBeCloseTo(3, 9);
    expect(v.impactUsd).toBeCloseTo(9.97, 9);
    expect(v.networkUsd).toBe(2);
    expect(v.totalUsd).toBeCloseTo(14.97, 9);
    expect(v.totalPct).toBeCloseTo(1.497, 9);
    expect(v.netValue).toBeCloseTo(985.03, 9);
    expect(v.breakEvenPct).toBeCloseTo((14.97 / 985.03) * 100, 9);
  });
  it("allows zero costs and a missing network fee", () => {
    const v = ok(tradeCost({ size: 50, feePct: 0, impactPct: 0, networkUsd: null }));
    expect(v.totalUsd).toBe(0);
    expect(v.breakEvenPct).toBe(0);
  });
  it("has no break-even when costs swallow the trade", () => {
    expect(ok(tradeCost({ size: 5, feePct: 0.3, impactPct: 0, networkUsd: 10 })).breakEvenPct).toBeNull();
  });
  it("rejects zero size, negative and out-of-range input", () => {
    expect(tradeCost({ size: 0, feePct: 0.3, impactPct: 0, networkUsd: 0 }).ok).toBe(false);
    expect(tradeCost({ size: -10, feePct: 0.3, impactPct: 0, networkUsd: 0 }).ok).toBe(false);
    expect(tradeCost({ size: 10, feePct: -1, impactPct: 0, networkUsd: 0 }).ok).toBe(false);
    expect(tradeCost({ size: 10, feePct: 100, impactPct: 0, networkUsd: 0 }).ok).toBe(false);
    expect(tradeCost({ size: 10, feePct: 0.3, impactPct: 100, networkUsd: 0 }).ok).toBe(false);
    expect(tradeCost({ size: 10, feePct: 0.3, impactPct: 0, networkUsd: -1 }).ok).toBe(false);
    expect(tradeCost({ size: NaN, feePct: 0.3, impactPct: 0, networkUsd: 0 }).ok).toBe(false);
    expect(tradeCost({ size: null, feePct: null, impactPct: null, networkUsd: null }).ok).toBe(false);
  });
  it("handles a huge trade", () => {
    expect(ok(tradeCost({ size: 1e18, feePct: 0.3, impactPct: 1, networkUsd: 1 })).totalPct).toBeCloseTo(1.297, 3);
  });
});

describe("scenario summaries", () => {
  it("summarises complete inputs and returns nothing for incomplete ones", () => {
    expect(summarize("profit-loss", { entry: "100", exit: "150", amount: "10", fees: "" }).map((l) => l.label)).toContain("Profit");
    expect(summarize("profit-loss", { entry: "100" })).toEqual([]);
    expect(summarize("fee-slippage", { size: "1000", fee: "0.3", impact: "1", network: "" })[0]!.text).toBe("$12.97");
    expect(summarize("staking-apy", { principal: "1000", apr: "10", freq: "1", years: "3" })[0]!.text).toBe("$1,331.00");
    expect(summarize("recovery", { mode: "move", from: "100", to: "50" })[0]!.text).toBe("-50.00%");
    expect(summarize("nope", {})).toEqual([]);
  });
});
