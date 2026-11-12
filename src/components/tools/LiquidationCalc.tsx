"use client";

import { ScenarioBar } from "@/components/engage/ScenarioBar";
import { fmtPct, fmtPrice, fmtQty, fmtUsd, parseNum } from "@/lib/tools/common";
import { liquidation, type Rung } from "@/lib/tools/liquidation";
import { LiveNumber } from "./LiveNumber";
import { CalcFrame, ChipGroup, Field, HowItWorks, Metric, missingFields, Outcome } from "./parts";
import { useCalcInputs } from "./useCalcInputs";

const EMPTY = { side: "long", entry: "", leverage: "", mmr: "", margin: "" };
const SIDES = [{ value: "long", label: "Long" }, { value: "short", label: "Short" }];
const QUICK_LEVERAGE = ["2", "5", "10", "20", "50", "100"];

/** Vertical price ladder. Safe prices sit at the top for a long, the liquidation rung glows red at the end of the run. */
function Ladder({ rungs, side }: { rungs: Rung[]; side: "long" | "short" }) {
  return (
    <ol className="space-y-1.5" aria-label="Price ladder from highest to lowest price">
      {rungs.map((r, i) => {
        const adverse = side === "long" ? r.movePct < 0 : r.movePct > 0;
        const tone = r.kind === "liq" ? "var(--down)" : r.kind === "entry" ? "var(--brand)" : adverse ? "var(--warm)" : "var(--up)";
        return (
          <li key={`${r.kind}-${r.price}`} className="row-in flex items-center gap-3" style={{ ["--i" as string]: i }}>
            <span className={`ladder-dot ${r.kind === "liq" ? "ladder-dot-liq" : ""}`} style={{ background: tone }} aria-hidden="true" />
            <div className={`flex min-w-0 flex-1 items-center justify-between gap-3 rounded-[var(--r-md)] border px-3 py-2 ${r.kind === "step" ? "border-line bg-[var(--surface-2)]" : ""}`} style={r.kind === "step" ? undefined : { borderColor: `color-mix(in srgb, ${tone} 55%, transparent)`, background: `color-mix(in srgb, ${tone} 10%, transparent)` }}>
              <span className="min-w-0 truncate text-xs font-semibold" style={{ color: r.kind === "step" ? "var(--text-muted)" : tone }}>{r.kind === "liq" ? "Liquidation" : r.kind === "entry" ? "Entry" : `${r.movePct > 0 ? "+" : ""}${r.movePct.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`}</span>
              <span className="num text-sm font-semibold">${fmtPrice(r.price)}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function LiquidationCalc() {
  const calc = useCalcInputs("liquidation-price", EMPTY);
  const f = calc.values;
  const set = calc.set;
  const side = f.side === "short" ? "short" : "long";
  const margin = f.margin.trim() === "" ? null : parseNum(f.margin);
  const r = liquidation({ side, entry: parseNum(f.entry), leverage: parseNum(f.leverage), mmrPct: parseNum(f.mmr), margin });
  const missing = missingFields([["entry price", f.entry], ["leverage", f.leverage], ["maintenance margin", f.mmr]]);
  return (
    <>
      <CalcFrame
        onReset={calc.reset}
        canReset={calc.dirty}
        toolbar={<ScenarioBar calc={calc} />}
        form={
          <>
            <ChipGroup label="Direction" options={SIDES} value={side} onChange={set("side")} />
            <Field id="lq-entry" label="Entry price" prefix="$" value={f.entry} onChange={set("entry")} placeholder="0.00" hint="The price you open the position at." />
            <div>
              <Field id="lq-lev" label="Leverage" suffix="x" value={f.leverage} onChange={set("leverage")} placeholder="10" hint="From 1x to 1000x." />
              <div className="-mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Common leverage">
                {QUICK_LEVERAGE.map((q) => <button key={q} type="button" className="chip" aria-pressed={f.leverage === q} onClick={() => set("leverage")(q)}>{q}x</button>)}
              </div>
            </div>
            <Field id="lq-mmr" label="Maintenance margin" suffix="%" value={f.mmr} onChange={set("mmr")} placeholder="0.5" hint="Your venue publishes this. It often rises with position size." />
            <Field id="lq-margin" label="Your margin" prefix="$" optional value={f.margin} onChange={set("margin")} placeholder="1000" hint="Adds position size and how much margin is lost at liquidation." />
          </>
        }
      >
        <Outcome missing={missing} errors={r.ok ? [] : r.errors}>
          {r.ok && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${r.value.side === "long" ? "badge-up" : "badge-down"}`}>{r.value.side === "long" ? "Long" : "Short"}</span>
                <span className="text-xs text-muted">Starting margin is {fmtPct(r.value.initialMarginPct)} of the position.</span>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                <Metric big tone="down" label="Liquidation price" note={r.value.liqPrice === 0 ? "Fully funded, so only a price of zero would liquidate it." : undefined}><LiveNumber value={r.value.liqPrice} format={(n) => `$${fmtPrice(n)}`} /></Metric>
                <Metric label={r.value.side === "long" ? "Fall needed to liquidate" : "Rise needed to liquidate"}><LiveNumber value={r.value.distancePct} format={(n) => fmtPct(n)} /></Metric>
                {r.value.notional !== null && r.value.quantity !== null && r.value.marginLost !== null && (
                  <>
                    <Metric label="Position size"><LiveNumber value={r.value.notional} format={fmtUsd} /></Metric>
                    <Metric label="Units held"><LiveNumber value={r.value.quantity} format={(n) => fmtQty(n, 6)} /></Metric>
                    <Metric tone="down" label="Margin lost at liquidation" note="Some margin may be kept as the maintenance requirement."><LiveNumber value={r.value.marginLost} format={fmtUsd} /></Metric>
                  </>
                )}
              </div>
              <Ladder key={`${r.value.side}-${r.value.liqPrice}`} rungs={r.value.ladder} side={r.value.side} />
              {r.value.distancePct < 10 && <p className="text-xs text-warm">The liquidation price is within {fmtPct(r.value.distancePct)} of entry. Ordinary price swings can reach it.</p>}
            </>
          )}
        </Outcome>
      </CalcFrame>
      <HowItWorks>
        <p>The position is isolated: its margin is the only collateral behind it. A position is liquidated when its equity falls to the maintenance requirement, which is <code>maintenance margin % x position value at the current price</code>.</p>
        <p>For a long with leverage <code>L</code> and maintenance rate <code>m</code>: <code>liquidation = entry x (1 - 1/L) / (1 - m)</code>. For a short: <code>liquidation = entry x (1 + 1/L) / (1 + m)</code>.</p>
        <p>Higher leverage moves the liquidation price closer to entry. At the highest settings a small move wipes out the margin. If the starting margin <code>1/L</code> is not above <code>m</code>, the position would be liquidated the moment it opens, so the calculator reports an error.</p>
        <p>Real venues differ. Exchanges use tiered maintenance rates, charge funding and trading fees, close positions at a mark price rather than the last trade, and may add a liquidation fee. Cross margin shares collateral across positions and gives a different price. Treat this as an estimate and check your venue.</p>
      </HowItWorks>
    </>
  );
}
