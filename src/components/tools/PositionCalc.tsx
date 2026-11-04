"use client";

import { useState } from "react";
import { fmtMultiple, fmtPct, fmtPrice, fmtQty, fmtUsd, parseNum } from "@/lib/tools/common";
import { positionSize } from "@/lib/tools/position";
import { LiveNumber } from "./LiveNumber";
import { CalcFrame, Field, HowItWorks, Metric, missingFields, Outcome } from "./parts";
import { Meter } from "@/components/ui/Kit";

const EMPTY = { account: "", risk: "", entry: "", stop: "", target: "" };

export function PositionCalc() {
  const [f, setF] = useState(EMPTY);
  const set = (k: keyof typeof EMPTY) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const target = f.target.trim() === "" ? null : parseNum(f.target);
  const r = positionSize({ account: parseNum(f.account), riskPct: parseNum(f.risk), entry: parseNum(f.entry), stop: parseNum(f.stop), target });
  const missing = missingFields([["account size", f.account], ["risk %", f.risk], ["entry price", f.entry], ["stop price", f.stop]]);
  return (
    <>
      <CalcFrame
        onReset={() => setF(EMPTY)}
        canReset={Object.values(f).some(Boolean)}
        form={
          <>
            <Field id="pos-account" label="Account size" prefix="$" value={f.account} onChange={set("account")} placeholder="10000" hint="The capital this trade is measured against." />
            <Field id="pos-risk" label="Risk per trade" suffix="%" value={f.risk} onChange={set("risk")} placeholder="1" hint="Share of the account you accept losing if the stop is hit." />
            <div className="grid grid-cols-2 gap-3">
              <Field id="pos-entry" label="Entry" prefix="$" value={f.entry} onChange={set("entry")} placeholder="0.00" />
              <Field id="pos-stop" label="Stop" prefix="$" value={f.stop} onChange={set("stop")} placeholder="0.00" />
            </div>
            <Field id="pos-target" label="Target" prefix="$" optional value={f.target} onChange={set("target")} placeholder="0.00" hint="Adds reward to risk. Above entry for a long, below for a short." />
          </>
        }
      >
        <Outcome missing={missing} errors={r.ok ? [] : r.errors}>
          {r.ok && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${r.value.side === "long" ? "badge-up" : "badge-down"}`}>{r.value.side === "long" ? "Long" : "Short"}</span>
                <span className="text-xs text-muted">Stop is {fmtPct(r.value.stopDistancePct)} from entry.</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric big label="Position size" note={`Worth ${fmtUsd(r.value.positionValue)} at your entry.`}><LiveNumber value={r.value.size} format={(n) => fmtQty(n, 6)} /> <span className="text-base font-medium text-muted">units</span></Metric>
                <Metric tone="down" label="Max loss at stop"><LiveNumber value={r.value.riskAmount} format={fmtUsd} /></Metric>
                <Metric label="Position value"><LiveNumber value={r.value.positionValue} format={fmtUsd} /></Metric>
                {r.value.rewardRisk !== null && r.value.rewardAmount !== null && (
                  <>
                    <Metric tone="up" label="Reward at target"><LiveNumber value={r.value.rewardAmount} format={fmtUsd} /></Metric>
                    <Metric label="Reward to risk" note={r.value.rewardRisk >= 2 ? "Many traders look for 2:1 or better." : "Below 2:1, so you need to win often."}><LiveNumber value={r.value.rewardRisk} format={(n) => `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} : 1`} /></Metric>
                  </>
                )}
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-xs text-muted"><span>Position size versus account</span><span className="num">{fmtMultiple(r.value.leverage)}</span></div>
                <Meter value={Math.min(100, r.value.leverage * 100)} tone={r.value.leverage > 1 ? "warm" : "brand"} label="Position value as a share of the account" />
                {r.value.leverage > 1 && <p className="mt-2 text-xs text-warm">This position is larger than your account, so it needs leverage or borrowed funds. Check the liquidation price on your venue.</p>}
              </div>
              <p className="text-xs text-muted">Entry {fmtPrice(parseNum(f.entry) ?? 0)}, stop {fmtPrice(parseNum(f.stop) ?? 0)}.</p>
            </>
          )}
        </Outcome>
      </CalcFrame>
      <HowItWorks>
        <p>The money you are willing to lose is <code>account size x risk %</code>.</p>
        <p>Each unit loses <code>|entry - stop|</code> if the stop is hit, so the size is <code>risk amount / |entry - stop|</code>.</p>
        <p>Reward to risk is <code>|target - entry| / |entry - stop|</code>. If the stop sits below entry the trade is treated as a long, above entry as a short.</p>
        <p>Slippage and gaps can make a real stop fill worse than the price you set, so the real loss can be larger.</p>
      </HowItWorks>
    </>
  );
}
