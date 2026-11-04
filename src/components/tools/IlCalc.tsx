"use client";

import { useMemo, useState } from "react";
import { fmtPct, fmtUsd, parseNum } from "@/lib/tools/common";
import { ilCurve, impermanentLoss } from "@/lib/tools/il";
import { LiveNumber } from "./LiveNumber";
import { CalcFrame, Field, HowItWorks, Metric, missingFields, Outcome } from "./parts";

const EMPTY = { change: "", deposit: "" };
const MAX_RATIO = 10;

/** Loss curve on a log price axis. The dot marks the ratio the person typed. */
function CurveChart({ ratio, il }: { ratio: number; il: number }) {
  const w = 320;
  const h = 150;
  const pts = useMemo(() => ilCurve(MAX_RATIO, 64), []);
  const lx = Math.log(MAX_RATIO);
  const x = (r: number) => ((Math.log(r) + lx) / (2 * lx)) * (w - 24) + 12;
  const minIl = Math.min(...pts.map((p) => p.ilPct));
  const y = (v: number) => 14 + (v / minIl) * (h - 40);
  const d = pts.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.ratio).toFixed(1)} ${y(p.ilPct).toFixed(1)}`).join(" ");
  const inRange = ratio >= 1 / MAX_RATIO && ratio <= MAX_RATIO;
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Impermanent loss against price ratio">
        <line x1="12" x2={w - 12} y1={y(0)} y2={y(0)} stroke="var(--line-2)" strokeDasharray="3 4" />
        <line x1={x(1)} x2={x(1)} y1="8" y2={h - 22} stroke="var(--line-1)" />
        <path d={`${d} L${x(MAX_RATIO)} ${y(0)} L${x(1 / MAX_RATIO)} ${y(0)} Z`} fill="color-mix(in srgb, var(--down) 12%, transparent)" />
        <path d={d} pathLength={1} fill="none" stroke="var(--down)" strokeWidth="2.2" strokeLinejoin="round" className="spark-draw-line" />
        {inRange && <circle cx={x(ratio)} cy={y(il)} r="5" fill="var(--brand)" stroke="var(--surface-1)" strokeWidth="2" style={{ transition: "cx 300ms ease, cy 300ms ease" }} />}
        <text x={x(1 / MAX_RATIO)} y={h - 6} fontSize="10" fill="var(--text-muted)" textAnchor="start">1/{MAX_RATIO}x</text>
        <text x={x(1)} y={h - 6} fontSize="10" fill="var(--text-muted)" textAnchor="middle">no change</text>
        <text x={x(MAX_RATIO)} y={h - 6} fontSize="10" fill="var(--text-muted)" textAnchor="end">{MAX_RATIO}x</text>
      </svg>
      <figcaption className="mt-1 text-xs text-muted">{inRange ? "The dot is your price change." : `Your price change is outside this chart (1/${MAX_RATIO}x to ${MAX_RATIO}x).`}</figcaption>
    </figure>
  );
}

export function IlCalc() {
  const [f, setF] = useState(EMPTY);
  const set = (k: keyof typeof EMPTY) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const deposit = f.deposit.trim() === "" ? null : parseNum(f.deposit);
  const r = impermanentLoss(parseNum(f.change), deposit);
  const missing = missingFields([["price change", f.change]]);
  return (
    <>
      <CalcFrame
        onReset={() => setF(EMPTY)}
        canReset={Object.values(f).some(Boolean)}
        form={
          <>
            <Field id="il-change" label="Price change of one token versus the other" suffix="%" value={f.change} onChange={set("change")} placeholder="100" hint="Use -50 for a halving and 100 for a doubling. If both move together, the ratio is what counts." />
            <Field id="il-deposit" label="Deposit value" prefix="$" optional value={f.deposit} onChange={set("deposit")} placeholder="1000" hint="Adds the dollar difference between holding and providing liquidity." />
          </>
        }
      >
        <Outcome missing={missing} errors={r.ok ? [] : r.errors}>
          {r.ok && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric big tone={r.value.ilPct < -0.005 ? "down" : null} label="Impermanent loss"><LiveNumber value={r.value.ilPct} format={(n) => fmtPct(Math.abs(n) < 0.005 ? 0 : n)} /></Metric>
                {r.value.holdValue !== null && r.value.poolValue !== null && r.value.lostValue !== null && (
                  <>
                    <Metric label="If you had held"><LiveNumber value={r.value.holdValue} format={fmtUsd} /></Metric>
                    <Metric label="In the pool, before fees"><LiveNumber value={r.value.poolValue} format={fmtUsd} /></Metric>
                    <Metric tone={r.value.lostValue > 0.005 ? "down" : null} label="Difference"><LiveNumber value={-r.value.lostValue} format={fmtUsd} /></Metric>
                  </>
                )}
              </div>
              <CurveChart ratio={r.value.ratio} il={r.value.ilPct} />
            </>
          )}
        </Outcome>
      </CalcFrame>
      <HowItWorks>
        <p>This models a standard 50/50 constant-product pool. If the price ratio between the two tokens changes by a factor <code>k</code>, the pool is worth <code>2 x sqrt(k) / (1 + k)</code> of what holding would be worth.</p>
        <p>Impermanent loss is that value minus 1, shown as a percentage. It is the same whether the ratio rises or falls by the same factor, and it is zero when the ratio is unchanged.</p>
        <p>Trading fees earned by the pool are not included. They can offset the loss or exceed it. The loss is called impermanent because it shrinks if the ratio returns to where it started.</p>
      </HowItWorks>
    </>
  );
}
