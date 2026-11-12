import { fmtMultiple, fmtPct, fmtPrice, fmtQty, fmtUsd, parseNum } from "./common";
import { tradeCost } from "./costs";
import { dca } from "./dca";
import { impermanentLoss } from "./il";
import { liquidation } from "./liquidation";
import { marketCapWhatIf } from "./marketcap";
import { profitAndLoss } from "./pnl";
import { positionSize } from "./position";
import { percentChange, recoveryGain } from "./recovery";
import { staking } from "./staking";
import { vesting } from "./vesting";

export interface SummaryLine { label: string; text: string }

type V = Record<string, string>;
const n = (v: V, k: string): number | null => parseNum(v[k] ?? "");
const optional = (v: V, k: string): number | null => ((v[k] ?? "").trim() === "" ? null : parseNum(v[k] ?? ""));

const SUMMARIZERS: Record<string, (v: V) => SummaryLine[]> = {
  "profit-loss": (v) => {
    const r = profitAndLoss({ entry: n(v, "entry"), exit: n(v, "exit"), amount: n(v, "amount"), fees: optional(v, "fees") });
    return r.ok ? [{ label: r.value.pnl >= 0 ? "Profit" : "Loss", text: fmtUsd(r.value.pnl) }, { label: "Return", text: fmtPct(r.value.pct, true) }, { label: "Break-even exit", text: fmtPrice(r.value.breakEven) }] : [];
  },
  "position-size": (v) => {
    const r = positionSize({ account: n(v, "account"), riskPct: n(v, "risk"), entry: n(v, "entry"), stop: n(v, "stop"), target: optional(v, "target") });
    if (!r.ok) return [];
    const out: SummaryLine[] = [{ label: "Position size", text: `${fmtQty(r.value.size, 6)} units` }, { label: "Max loss", text: fmtUsd(r.value.riskAmount) }, { label: "Position value", text: fmtUsd(r.value.positionValue) }];
    if (r.value.rewardRisk !== null) out.push({ label: "Reward to risk", text: `${r.value.rewardRisk.toFixed(2)} : 1` });
    return out;
  },
  dca: (v) => {
    const r = v.mode === "list" ? dca({ mode: "list", amount: n(v, "amount"), prices: v.prices ?? "" }) : dca({ mode: "linear", amount: n(v, "amount"), count: n(v, "count"), start: n(v, "start"), end: n(v, "end") });
    return r.ok ? [{ label: "Average cost", text: fmtPrice(r.value.avgCost) }, { label: "Units bought", text: fmtQty(r.value.totalUnits, 6) }, { label: "Total spent", text: fmtUsd(r.value.totalSpent) }, { label: "Result", text: fmtPct(r.value.pnlPct, true) }] : [];
  },
  "market-cap": (v) => {
    const r = marketCapWhatIf({ price: n(v, "price"), current: n(v, "current"), target: n(v, "target") });
    return r.ok ? [{ label: "Implied price", text: `$${fmtPrice(r.value.impliedPrice)}` }, { label: "Multiple", text: fmtMultiple(r.value.multiple) }, { label: "Price change", text: fmtPct(r.value.changePct, true) }] : [];
  },
  recovery: (v) => {
    if (v.mode === "move") {
      const r = percentChange(n(v, "from"), n(v, "to"));
      if (!r.ok) return [];
      const out: SummaryLine[] = [{ label: "Change", text: fmtPct(r.value.changePct, true) }];
      if (r.value.recoverPct !== null) out.push({ label: "Move to get back", text: fmtPct(r.value.recoverPct, true) });
      return out;
    }
    const r = recoveryGain(n(v, "loss"));
    return r.ok ? [{ label: "Loss", text: fmtPct(r.value.lossPct) }, { label: "Gain needed", text: fmtPct(r.value.gainNeededPct, true) }] : [];
  },
  "impermanent-loss": (v) => {
    const r = impermanentLoss(n(v, "change"), optional(v, "deposit"));
    if (!r.ok) return [];
    const out: SummaryLine[] = [{ label: "Impermanent loss", text: fmtPct(Math.abs(r.value.ilPct) < 0.005 ? 0 : r.value.ilPct) }];
    if (r.value.lostValue !== null) out.push({ label: "Difference vs holding", text: fmtUsd(-r.value.lostValue) });
    return out;
  },
  "token-vesting": (v) => {
    const r = vesting({ total: n(v, "total"), cliff: n(v, "cliff"), linear: n(v, "linear"), tgePct: optional(v, "tge") });
    return r.ok ? [{ label: "Fully unlocked", text: `Month ${r.value.totalMonths}` }, { label: "First unlock after start", text: `Month ${r.value.firstUnlockMonth}` }, { label: "Unlocked each month", text: fmtQty(r.value.perMonth, 2) }] : [];
  },
  "staking-apy": (v) => {
    const r = staking({ principal: n(v, "principal"), aprPct: n(v, "apr"), perYear: n(v, "freq"), years: n(v, "years") });
    return r.ok ? [{ label: "With compounding", text: fmtUsd(r.value.compoundFinal) }, { label: "Simple interest", text: fmtUsd(r.value.simpleFinal) }, { label: "Effective APY", text: fmtPct(r.value.apyPct) }] : [];
  },
  "liquidation-price": (v) => {
    const r = liquidation({ side: v.side ?? null, entry: n(v, "entry"), leverage: n(v, "leverage"), mmrPct: n(v, "mmr"), margin: optional(v, "margin") });
    return r.ok ? [{ label: "Liquidation price", text: `$${fmtPrice(r.value.liqPrice)}` }, { label: "Distance from entry", text: fmtPct(r.value.distancePct) }] : [];
  },
  "fee-slippage": (v) => {
    const r = tradeCost({ size: n(v, "size"), feePct: n(v, "fee"), impactPct: n(v, "impact"), networkUsd: optional(v, "network") });
    return r.ok ? [{ label: "Total cost", text: fmtUsd(r.value.totalUsd) }, { label: "Share of trade", text: fmtPct(r.value.totalPct) }] : [];
  },
};

/** Key results for a set of typed inputs, used to compare saved scenarios. Empty when the inputs are incomplete or invalid. */
export function summarize(slug: string, values: V): SummaryLine[] {
  return SUMMARIZERS[slug]?.(values) ?? [];
}
