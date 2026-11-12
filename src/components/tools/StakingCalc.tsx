"use client";

import { useState } from "react";
import { ScenarioBar } from "@/components/engage/ScenarioBar";
import { fmtPct, fmtUsd, parseNum } from "@/lib/tools/common";
import { staking, type GrowthPoint } from "@/lib/tools/staking";
import { LiveNumber } from "./LiveNumber";
import { CalcFrame, ChipGroup, Field, HowItWorks, Metric, missingFields, Outcome } from "./parts";
import { useCalcInputs } from "./useCalcInputs";

const EMPTY = { principal: "", apr: "", freq: "12", years: "" };
const FREQ = [
  { value: "1", label: "Yearly" },
  { value: "4", label: "Quarterly" },
  { value: "12", label: "Monthly" },
  { value: "52", label: "Weekly" },
  { value: "365", label: "Daily" },
];
const W = 320;
const H = 170;
const PAD = { l: 8, r: 8, t: 12, b: 26 };

/** Simple and compound growth over the same period. The shaded band between the lines is what compounding adds. */
function GrowthChart({ curve, years, principal }: { curve: GrowthPoint[]; years: number; principal: number }) {
  const hi = Math.max(...curve.map((p) => Math.max(p.simple, p.compound)), principal);
  const lo = Math.min(principal, ...curve.map((p) => Math.min(p.simple, p.compound)));
  const span = hi - lo || 1;
  const x = (t: number) => PAD.l + (t / years) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / span) * (H - PAD.t - PAD.b);
  const path = (pick: (p: GrowthPoint) => number) => curve.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.year).toFixed(1)} ${y(pick(p)).toFixed(1)}`).join(" ");
  const band = `${path((p) => p.compound)} ${[...curve].reverse().map((p) => `L${x(p.year).toFixed(1)} ${y(p.simple).toFixed(1)}`).join(" ")} Z`;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Growth of the staked amount with simple interest and with compounding">
        <line x1={PAD.l} x2={W - PAD.r} y1={y(principal)} y2={y(principal)} stroke="var(--line-2)" strokeDasharray="3 4" />
        <g className="area-reveal"><path d={band} fill="color-mix(in srgb, var(--up) 20%, transparent)" /></g>
        <path d={path((p) => p.simple)} pathLength={1} fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinejoin="round" className="spark-draw-line" />
        <path d={path((p) => p.compound)} pathLength={1} fill="none" stroke="var(--brand)" strokeWidth="2.4" strokeLinejoin="round" className="spark-draw-line" />
        <text x={PAD.l} y={H - 8} fontSize="9" fill="var(--text-muted)" textAnchor="start">Start</text>
        <text x={W - PAD.r} y={H - 8} fontSize="9" fill="var(--text-muted)" textAnchor="end">{years.toLocaleString("en-US", { maximumFractionDigits: 2 })} years</text>
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 rounded bg-[var(--brand)]" />Compounding</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 rounded bg-[var(--text-muted)]" />Simple interest</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-3.5 rounded-sm bg-[color-mix(in_srgb,var(--up)_35%,transparent)]" />Extra from compounding</span>
      </figcaption>
    </figure>
  );
}

export function StakingCalc() {
  const calc = useCalcInputs("staking-apy", EMPTY);
  const f = calc.values;
  const set = calc.set;
  const [all, setAll] = useState(false);
  const principal = parseNum(f.principal);
  const years = parseNum(f.years);
  const r = staking({ principal, aprPct: parseNum(f.apr), perYear: parseNum(f.freq), years });
  const missing = missingFields([["amount staked", f.principal], ["APR", f.apr], ["years", f.years]]);
  const rows = r.ok ? (all ? r.value.yearly : r.value.yearly.slice(0, 8)) : [];
  return (
    <>
      <CalcFrame
        onReset={() => { calc.reset(); setAll(false); }}
        canReset={calc.dirty}
        toolbar={<ScenarioBar calc={calc} />}
        form={
          <>
            <Field id="st-principal" label="Amount staked" prefix="$" value={f.principal} onChange={set("principal")} placeholder="5000" hint="The starting value in dollars." />
            <Field id="st-apr" label="Reward rate (APR)" suffix="%" value={f.apr} onChange={set("apr")} placeholder="8" hint="The yearly rate before compounding, as the platform quotes it." />
            <div className="space-y-1.5">
              <p className="text-[13px] font-semibold text-soft">Rewards are added back</p>
              <ChipGroup label="Compounding frequency" options={FREQ} value={f.freq} onChange={set("freq")} />
            </div>
            <Field id="st-years" label="Time" suffix="years" value={f.years} onChange={set("years")} placeholder="3" hint="Up to 100. Fractions such as 0.5 are fine." />
          </>
        }
      >
        <Outcome missing={missing} errors={r.ok ? [] : r.errors}>
          {r.ok && principal !== null && years !== null && (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                <Metric big tone="up" label="Value with compounding" note={`Earned ${fmtUsd(r.value.compoundEarned)} on ${fmtUsd(principal)}.`}><LiveNumber value={r.value.compoundFinal} format={fmtUsd} /></Metric>
                <Metric label="Value with simple interest"><LiveNumber value={r.value.simpleFinal} format={fmtUsd} /></Metric>
                <Metric tone={r.value.extraFromCompounding > 0.005 ? "up" : null} label="Extra from compounding"><LiveNumber value={r.value.extraFromCompounding} format={(n) => `+${fmtUsd(n)}`} /></Metric>
                <Metric label="Effective yearly rate (APY)" note="What one year of compounding really returns."><LiveNumber value={r.value.apyPct} format={(n) => fmtPct(n)} /></Metric>
              </div>
              <GrowthChart key={`${f.apr}-${f.freq}-${f.years}`} curve={r.value.curve} years={years} principal={principal} />
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[300px] text-left text-sm">
                    <thead>
                      <tr className="text-xs text-muted">
                        <th scope="col" className="py-1.5 pr-2 font-semibold">Year</th>
                        <th scope="col" className="py-1.5 pr-2 font-semibold">Simple</th>
                        <th scope="col" className="py-1.5 text-right font-semibold">Compounding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((x) => (
                        <tr key={x.year} className="border-t border-line">
                          <td className="num py-1.5 pr-2 text-muted">{Number.isInteger(x.year) ? x.year : x.year.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td>
                          <td className="num py-1.5 pr-2">{fmtUsd(x.simple)}</td>
                          <td className="num py-1.5 text-right">{fmtUsd(x.compound)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {r.value.yearly.length > 8 && <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => setAll((v) => !v)}>{all ? "Show fewer years" : `Show all ${r.value.yearly.length} rows`}</button>}
              </div>
            </>
          )}
        </Outcome>
      </CalcFrame>
      <HowItWorks>
        <p>Simple interest pays on the original amount only: <code>P x (1 + APR x years)</code>.</p>
        <p>Compounding adds each payout to the balance, so later payouts earn too: <code>P x (1 + APR / n) ^ (n x years)</code>, where <code>n</code> is how many times a year rewards are added back.</p>
        <p>The effective yearly rate, APY, is <code>(1 + APR / n) ^ n - 1</code>. It is always at least the APR, and it grows with <code>n</code> but with diminishing returns. Daily compounding is only slightly above weekly.</p>
        <p>The calculator holds the rate constant for the whole period. Real staking rates move with participation and rewards, rewards can be paid in a token whose price changes, and some protocols do not auto-compound. Fees, taxes and lock-up or unbonding periods are not included.</p>
      </HowItWorks>
    </>
  );
}
