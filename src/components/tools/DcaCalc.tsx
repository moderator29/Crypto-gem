"use client";

import { useMemo, useState } from "react";
import { dca } from "@/lib/tools/dca";
import { fmtPct, fmtPrice, fmtQty, fmtUsd, parseNum } from "@/lib/tools/common";
import { ScenarioBar } from "@/components/engage/ScenarioBar";
import { useCalcInputs } from "./useCalcInputs";
import { LiveNumber } from "./LiveNumber";
import { CalcFrame, Field, HowItWorks, Metric, missingFields, Outcome } from "./parts";

const EMPTY = { mode: "linear", amount: "", count: "", start: "", end: "", prices: "" };

/** Price path with the running average cost drawn over it. */
function PathChart({ prices, avg }: { prices: number[]; avg: number[] }) {
  const w = 320;
  const h = 110;
  const all = [...prices, ...avg];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = hi - lo || 1;
  const x = (k: number) => (prices.length === 1 ? w / 2 : (k / (prices.length - 1)) * (w - 16) + 8);
  const y = (v: number) => h - 10 - ((v - lo) / span) * (h - 20);
  const line = (a: number[]) => a.map((v, k) => `${k === 0 ? "M" : "L"}${x(k).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Price path and running average cost">
        <path d={line(prices)} pathLength={1} fill="none" stroke="var(--text-muted)" strokeWidth="1.6" strokeLinejoin="round" className="spark-draw-line" />
        <path d={line(avg)} pathLength={1} fill="none" stroke="var(--brand)" strokeWidth="2.2" strokeLinejoin="round" className="spark-draw-line" />
        {prices.length <= 60 && prices.map((p, k) => <circle key={k} cx={x(k)} cy={y(p)} r="2.4" fill="var(--text-muted)" />)}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 rounded bg-[var(--text-muted)]" />Price at each buy</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 rounded bg-[var(--brand)]" />Your average cost</span>
      </figcaption>
    </figure>
  );
}

export function DcaCalc() {
  const calc = useCalcInputs("dca", EMPTY);
  const f = calc.values;
  const [all, setAll] = useState(false);
  const set = calc.set;
  const mode: "linear" | "list" = f.mode === "list" ? "list" : "linear";
  const setMode = (m: "linear" | "list") => set("mode")(m);
  const count = parseNum(f.count);
  const r = useMemo(
    () => (mode === "linear" ? dca({ mode, amount: parseNum(f.amount), count, start: parseNum(f.start), end: parseNum(f.end) }) : dca({ mode, amount: parseNum(f.amount), prices: f.prices })),
    [mode, f, count],
  );
  const missing = mode === "linear" ? missingFields([["amount per buy", f.amount], ["number of buys", f.count], ["start price", f.start], ["end price", f.end]]) : [...missingFields([["amount per buy", f.amount]]), ...(f.prices.trim() === "" ? ["price list"] : [])];
  const tone = r.ok ? (r.value.pnl > 0 ? "up" : r.value.pnl < 0 ? "down" : null) : null;
  const rows = r.ok ? (all ? r.value.rows : r.value.rows.slice(0, 8)) : [];
  return (
    <>
      <CalcFrame
        onReset={() => { calc.reset(); setAll(false); }}
        canReset={calc.dirty}
        toolbar={<ScenarioBar calc={calc} />}
        form={
          <>
            <Field id="dca-amount" label="Amount per buy" prefix="$" value={f.amount} onChange={set("amount")} placeholder="100" hint="The same dollar amount every time." />
            <div role="group" aria-label="Price path" className="flex gap-2">
              <button type="button" className="chip" aria-pressed={mode === "linear"} onClick={() => setMode("linear")}>Straight line</button>
              <button type="button" className="chip" aria-pressed={mode === "list"} onClick={() => setMode("list")}>My own prices</button>
            </div>
            {mode === "linear" ? (
              <>
                <Field id="dca-count" label="Number of buys" value={f.count} onChange={set("count")} placeholder="12" hint="Whole number, 1 to 520." />
                <div className="grid grid-cols-2 gap-3">
                  <Field id="dca-start" label="First price" prefix="$" value={f.start} onChange={set("start")} placeholder="0.00" />
                  <Field id="dca-end" label="Last price" prefix="$" value={f.end} onChange={set("end")} placeholder="0.00" />
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="dca-prices" className="text-[13px] font-semibold text-soft">Price at each buy</label>
                <textarea id="dca-prices" className="input num mt-1.5 min-h-28" value={f.prices} onChange={(e) => set("prices")(e.target.value)} placeholder={"One price per buy, separated by commas, spaces or new lines"} spellCheck={false} />
                <p className="mt-1 text-xs text-muted">The number of prices sets the number of buys.</p>
              </div>
            )}
          </>
        }
      >
        <Outcome missing={missing} errors={r.ok ? [] : r.errors}>
          {r.ok && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric big label="Average cost per unit" note={`After ${r.value.rows.length} buys.`}><LiveNumber value={r.value.avgCost} format={(n) => `$${fmtPrice(n)}`} /></Metric>
                <Metric label="Total invested"><LiveNumber value={r.value.totalSpent} format={fmtUsd} /></Metric>
                <Metric label="Units bought"><LiveNumber value={r.value.totalUnits} format={(n) => fmtQty(n, 6)} /></Metric>
                <Metric label="Value at last price" note={`At $${fmtPrice(r.value.lastPrice)}.`}><LiveNumber value={r.value.currentValue} format={fmtUsd} /></Metric>
                <Metric tone={tone} label="Profit or loss"><LiveNumber value={r.value.pnl} format={fmtUsd} /> <span className="text-sm font-medium">({fmtPct(r.value.pnlPct, true)})</span></Metric>
              </div>
              <PathChart prices={r.value.rows.map((x) => x.price)} avg={r.value.rows.map((x) => x.avgCost)} />
              <div className="card-flat p-3.5 text-sm text-soft">
                Buying everything at the first price would have given <strong className="num text-text">{fmtQty(r.value.lumpUnits, 6)}</strong> units, worth <strong className="num text-text">{fmtUsd(r.value.lumpValue)}</strong> at the last price, versus <strong className="num text-text">{fmtUsd(r.value.currentValue)}</strong> with DCA.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[300px] text-left text-xs">
                  <thead className="text-muted"><tr><th className="py-1.5 pr-2 font-semibold">#</th><th className="py-1.5 pr-2 font-semibold">Price</th><th className="py-1.5 pr-2 font-semibold">Units</th><th className="py-1.5 text-right font-semibold">Avg cost</th></tr></thead>
                  <tbody>
                    {rows.map((x) => (
                      <tr key={x.period} className="row-in border-t border-line" style={{ ["--i" as string]: x.period }}>
                        <td className="num py-1.5 pr-2 text-muted">{x.period}</td>
                        <td className="num py-1.5 pr-2">${fmtPrice(x.price)}</td>
                        <td className="num py-1.5 pr-2">{fmtQty(x.units, 6)}</td>
                        <td className="num py-1.5 text-right">${fmtPrice(x.avgCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {r.value.rows.length > 8 && <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => setAll((v) => !v)}>{all ? "Show fewer" : `Show all ${r.value.rows.length} buys`}</button>}
              </div>
            </>
          )}
        </Outcome>
      </CalcFrame>
      <HowItWorks>
        <p>Each buy turns a fixed dollar amount into <code>amount / price</code> units. Cheap prices buy more units than expensive ones.</p>
        <p>Your average cost is <code>total invested / total units</code>. This is a weighted average, not the simple average of the prices, which is why it sits closer to the lower prices.</p>
        <p>The straight-line option draws prices evenly from the first to the last price. Real markets move in a jagged way, so use your own prices if you want to replay a specific period.</p>
        <p>The lump-sum comparison assumes you put the whole total in at the first price. It uses only the prices you provided.</p>
      </HowItWorks>
    </>
  );
}
