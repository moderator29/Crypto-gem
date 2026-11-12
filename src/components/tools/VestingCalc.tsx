"use client";

import Link from "next/link";
import { useState } from "react";
import { ScenarioBar } from "@/components/engage/ScenarioBar";
import { fmtPct, fmtQty, parseNum } from "@/lib/tools/common";
import { vesting, type VestingRow } from "@/lib/tools/vesting";
import { LiveNumber } from "./LiveNumber";
import { CalcFrame, Field, HowItWorks, Metric, missingFields, Outcome } from "./parts";
import { useCalcInputs } from "./useCalcInputs";

const EMPTY = { total: "", cliff: "", linear: "", tge: "" };
const W = 320;
const H = 170;
const PAD = { l: 34, r: 10, t: 12, b: 26 };

/** Released and locked tokens over time as a stacked area. The dashed line marks the month picked with the slider. */
function ScheduleChart({ rows, cliff, linear, month }: { rows: VestingRow[]; cliff: number; linear: number; month: number }) {
  const last = rows.length - 1;
  const total = rows[last]?.released ?? 1;
  const x = (m: number) => PAD.l + (m / Math.max(1, last)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / total) * (H - PAD.t - PAD.b);
  const pts: Array<[number, number]> = linear === 0 ? [[0, rows[0]?.released ?? 0], [cliff, rows[0]?.released ?? 0], [cliff, total]] : rows.map((r) => [r.month, r.released]);
  const line = pts.map(([m, v], k) => `${k === 0 ? "M" : "L"}${x(m).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const base = y(0);
  const releasedArea = `${line} L${x(pts[pts.length - 1]?.[0] ?? 0).toFixed(1)} ${base} L${x(0).toFixed(1)} ${base} Z`;
  const lockedArea = `${line} L${x(last).toFixed(1)} ${y(total)} L${x(0).toFixed(1)} ${y(total)} Z`;
  const mark = x(Math.min(month, last));
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Released and locked tokens by month">
        {[0, 0.5, 1].map((g) => (
          <g key={g}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(total * g)} y2={y(total * g)} stroke="var(--line-1)" strokeDasharray={g === 0 ? undefined : "3 4"} />
            <text x={PAD.l - 6} y={y(total * g) + 3} fontSize="9" fill="var(--text-muted)" textAnchor="end">{g * 100}%</text>
          </g>
        ))}
        <g className="area-reveal">
          <path d={lockedArea} fill="color-mix(in srgb, var(--warm) 16%, transparent)" />
          <path d={releasedArea} fill="color-mix(in srgb, var(--brand) 26%, transparent)" />
        </g>
        <path d={line} pathLength={1} fill="none" stroke="var(--brand)" strokeWidth="2.2" strokeLinejoin="round" className="spark-draw-line" />
        <line x1={mark} x2={mark} y1={PAD.t} y2={base} stroke="var(--text-soft)" strokeDasharray="3 3" style={{ transition: "x1 160ms ease, x2 160ms ease" }} />
        <text x={x(0)} y={H - 8} fontSize="9" fill="var(--text-muted)" textAnchor="start">Month 0</text>
        <text x={x(last)} y={H - 8} fontSize="9" fill="var(--text-muted)" textAnchor="end">Month {last}</text>
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-3.5 rounded-sm bg-[color-mix(in_srgb,var(--brand)_45%,transparent)]" />Released</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-3.5 rounded-sm bg-[color-mix(in_srgb,var(--warm)_35%,transparent)]" />Still locked</span>
      </figcaption>
    </figure>
  );
}

export function VestingCalc() {
  const calc = useCalcInputs("token-vesting", EMPTY);
  const f = calc.values;
  const set = calc.set;
  const [scrub, setScrub] = useState(0);
  const [all, setAll] = useState(false);
  const tge = f.tge.trim() === "" ? null : parseNum(f.tge);
  const cliff = parseNum(f.cliff);
  const linear = parseNum(f.linear);
  const r = vesting({ total: parseNum(f.total), cliff, linear, tgePct: tge });
  const missing = missingFields([["total tokens", f.total], ["cliff months", f.cliff], ["linear months", f.linear]]);
  const rows = r.ok ? (all ? r.value.rows : r.value.rows.slice(0, 13)) : [];
  const pick = r.ok ? r.value.rows[Math.min(scrub, r.value.totalMonths)] : undefined;
  return (
    <>
      <CalcFrame
        onReset={() => { calc.reset(); setScrub(0); setAll(false); }}
        canReset={calc.dirty}
        toolbar={<ScenarioBar calc={calc} />}
        form={
          <>
            <Field id="vs-total" label="Total tokens in the grant" suffix="tokens" value={f.total} onChange={set("total")} placeholder="1000000" hint="The full amount that will unlock over the schedule." />
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
              <Field id="vs-cliff" label="Cliff" suffix="months" value={f.cliff} onChange={set("cliff")} placeholder="12" hint="Nothing unlocks until it ends." />
              <Field id="vs-linear" label="Linear unlock" suffix="months" value={f.linear} onChange={set("linear")} placeholder="24" hint="Equal monthly steps after the cliff." />
            </div>
            <Field id="vs-tge" label="Unlocked at start" suffix="%" optional value={f.tge} onChange={set("tge")} placeholder="0" hint="Share released on day one, before the cliff." />
          </>
        }
      >
        <Outcome missing={missing} errors={r.ok ? [] : r.errors}>
          {r.ok && (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                <Metric big label="Fully unlocked at" note={`About ${(r.value.totalMonths / 12).toLocaleString("en-US", { maximumFractionDigits: 1 })} years after the start.`}>Month <LiveNumber value={r.value.totalMonths} format={(n) => Math.round(n).toString()} /></Metric>
                <Metric label="Unlocked at start"><LiveNumber value={r.value.atStart} format={(n) => fmtQty(n, 2)} /></Metric>
                <Metric label="Unlocked each month" note={r.value.perMonth > 0 ? "During the linear period." : "No linear period, so the rest unlocks when the cliff ends."}><LiveNumber value={r.value.perMonth} format={(n) => fmtQty(n, 2)} /></Metric>
              </div>
              <ScheduleChart key={`${cliff}-${linear}-${tge}`} rows={r.value.rows} cliff={cliff ?? 0} linear={linear ?? 0} month={scrub} />
              <div className="card-flat space-y-2 p-3.5">
                <label htmlFor="vs-scrub" className="flex items-center justify-between gap-3 text-[13px] font-semibold text-soft">
                  <span>Check a month</span>
                  <span className="num text-text">Month {Math.min(scrub, r.value.totalMonths)}</span>
                </label>
                <input id="vs-scrub" type="range" min={0} max={r.value.totalMonths} step={1} value={Math.min(scrub, r.value.totalMonths)} onChange={(e) => setScrub(Number(e.target.value))} className="w-full accent-[var(--brand)]" />
                {pick && (
                  <p className="num text-sm text-soft" aria-live="polite">
                    <span className="font-semibold text-text">{fmtQty(pick.released, 2)}</span> released ({fmtPct(pick.releasedPct)}), <span className="font-semibold text-text">{fmtQty(pick.locked, 2)}</span> still locked.
                  </p>
                )}
              </div>
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[300px] text-left text-sm">
                    <thead>
                      <tr className="text-xs text-muted">
                        <th scope="col" className="py-1.5 pr-2 font-semibold">Month</th>
                        <th scope="col" className="py-1.5 pr-2 font-semibold">Released</th>
                        <th scope="col" className="hidden py-1.5 pr-2 font-semibold sm:table-cell">New</th>
                        <th scope="col" className="py-1.5 pr-2 font-semibold">Locked</th>
                        <th scope="col" className="py-1.5 text-right font-semibold">Done</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((x) => (
                        <tr key={x.month} className="border-t border-line">
                          <td className="num py-1.5 pr-2 text-muted">{x.month}</td>
                          <td className="num py-1.5 pr-2">{fmtQty(x.released, 2)}</td>
                          <td className="num hidden py-1.5 pr-2 text-up sm:table-cell">{x.unlocked > 0 ? `+${fmtQty(x.unlocked, 2)}` : "-"}</td>
                          <td className="num py-1.5 pr-2">{fmtQty(x.locked, 2)}</td>
                          <td className="num py-1.5 text-right">{fmtPct(x.releasedPct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {r.value.rows.length > 13 && <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => setAll((v) => !v)}>{all ? "Show fewer months" : `Show all ${r.value.rows.length} months`}</button>}
              </div>
            </>
          )}
        </Outcome>
      </CalcFrame>
      <HowItWorks>
        <p>The schedule has three parts. An optional share unlocks at month 0. Nothing more unlocks during the cliff. After the cliff, the remaining tokens unlock in equal monthly steps over the linear period.</p>
        <p>Released at month <code>m</code> is <code>start + (total - start) x (m - cliff) / linear</code> once the cliff has passed, and the locked amount is <code>total - released</code>. If the linear period is zero, everything left unlocks in one step when the cliff ends.</p>
        <p>This is one common design. Some projects unlock by quarter, by block, or by milestone, and some give the cliff share in one lump. Check the schedule your project actually published before relying on a number here.</p>
        <p>Unlocks matter because new supply can meet limited demand. Read <Link href="/learn/market-cap-vs-fdv" className="font-semibold text-brand">Market cap versus FDV</Link> for how locked tokens change the picture.</p>
      </HowItWorks>
    </>
  );
}
