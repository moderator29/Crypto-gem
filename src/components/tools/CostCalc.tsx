"use client";

import Link from "next/link";
import { ScenarioBar } from "@/components/engage/ScenarioBar";
import { fmtPct, fmtUsd, parseNum } from "@/lib/tools/common";
import { tradeCost } from "@/lib/tools/costs";
import { LiveNumber } from "./LiveNumber";
import { CalcFrame, Field, HowItWorks, Metric, missingFields, Outcome } from "./parts";
import { useCalcInputs } from "./useCalcInputs";

const EMPTY = { size: "", fee: "", impact: "", network: "" };
const TIERS = ["0.01", "0.05", "0.3", "1"];

/** Stacked bar of where the cost goes. Each segment grows in from the left. */
function CostBar({ parts }: { parts: Array<{ label: string; value: number; color: string }> }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (total <= 0) return <p className="text-xs text-muted">No cost to show for these inputs.</p>;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-[var(--surface-3)]" role="img" aria-label="Share of total cost by type">
        {parts.filter((p) => p.value > 0).map((p) => <div key={p.label} className="h-full transition-[width] duration-500 ease-out" style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        {parts.map((p) => (
          <li key={p.label} className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.label} <span className="num font-semibold text-soft">{fmtPct((p.value / total) * 100)}</span></li>
        ))}
      </ul>
    </div>
  );
}

/** Swap cost calculator: pool fee, price impact and network fee. */
export function CostCalc() {
  const calc = useCalcInputs("fee-slippage", EMPTY);
  const f = calc.values;
  const set = calc.set;
  const network = f.network.trim() === "" ? null : parseNum(f.network);
  const r = tradeCost({ size: parseNum(f.size), feePct: parseNum(f.fee), impactPct: parseNum(f.impact), networkUsd: network });
  const missing = missingFields([["trade size", f.size], ["pool fee", f.fee], ["price impact", f.impact]]);
  return (
    <>
      <CalcFrame
        onReset={calc.reset}
        canReset={calc.dirty}
        toolbar={<ScenarioBar calc={calc} />}
        form={
          <>
            <Field id="fc-size" label="Trade size" prefix="$" value={f.size} onChange={set("size")} placeholder="2000" hint="The dollar value you are swapping." />
            <div>
              <Field id="fc-fee" label="Pool fee tier" suffix="%" value={f.fee} onChange={set("fee")} placeholder="0.3" hint="Shown on the pool or swap screen." />
              <div className="-mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Common fee tiers">
                {TIERS.map((t) => <button key={t} type="button" className="chip" aria-pressed={f.fee === t} onClick={() => set("fee")(t)}>{t}%</button>)}
              </div>
            </div>
            <Field id="fc-impact" label="Price impact" suffix="%" value={f.impact} onChange={set("impact")} placeholder="0.4" hint="The swap screen shows this before you sign. Use 0 if you have none." />
            <Field id="fc-network" label="Network fee" prefix="$" optional value={f.network} onChange={set("network")} placeholder="1.50" hint="Gas for the transaction, in dollars." />
          </>
        }
      >
        <Outcome missing={missing} errors={r.ok ? [] : r.errors}>
          {r.ok && (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
                <Metric big tone={r.value.totalPct > 1 ? "down" : null} label="Total cost" note={`${fmtPct(r.value.totalPct)} of the trade.`}><LiveNumber value={r.value.totalUsd} format={fmtUsd} /></Metric>
                <Metric label="Pool fee"><LiveNumber value={r.value.feeUsd} format={fmtUsd} /></Metric>
                <Metric label="Price impact"><LiveNumber value={r.value.impactUsd} format={fmtUsd} /></Metric>
                <Metric label="Network fee"><LiveNumber value={r.value.networkUsd} format={fmtUsd} /></Metric>
                <Metric label="Value you end up with" note="Trade size minus all three costs."><LiveNumber value={r.value.netValue} format={fmtUsd} /></Metric>
                <Metric label="Move needed to break even" note={r.value.breakEvenPct === null ? "Costs are as large as the trade, so no price move recovers them." : "The price rise that earns the cost back."}>{r.value.breakEvenPct === null ? "-" : <LiveNumber value={r.value.breakEvenPct} format={(n) => fmtPct(n, true)} />}</Metric>
              </div>
              <CostBar parts={[{ label: "Pool fee", value: r.value.feeUsd, color: "var(--brand)" }, { label: "Price impact", value: r.value.impactUsd, color: "var(--warm)" }, { label: "Network fee", value: r.value.networkUsd, color: "var(--down)" }]} />
              {r.value.totalPct >= 3 && <p className="text-xs text-warm">Costs take {fmtPct(r.value.totalPct)} of this trade. A smaller or split order, a deeper pool or a cheaper fee tier can lower it.</p>}
            </>
          )}
        </Outcome>
      </CalcFrame>
      <HowItWorks>
        <p>The pool fee is <code>trade size x fee tier</code>. It is taken from the amount you send.</p>
        <p>Price impact is how far your own trade moves the pool price. It is applied to what is left after the fee: <code>(size - fee) x impact %</code>. The network fee is a flat dollar amount for the transaction.</p>
        <p>Total cost is the three added together, and the share is <code>total / trade size</code>. To get back to even you need the price to rise by <code>total / (size - total)</code>.</p>
        <p>Impact is not the same as slippage tolerance: impact is what you expect to lose, while tolerance is the most you will accept. Read <Link href="/learn/slippage-and-price-impact" className="font-semibold text-brand">Slippage and price impact</Link> for the difference. Bots can also add cost. See <Link href="/learn/mev-and-sandwich-attacks" className="font-semibold text-brand">MEV and sandwich attacks</Link>.</p>
        <p>The calculator uses only the numbers you type. It does not look up live pools or gas prices, so copy them from your swap screen.</p>
      </HowItWorks>
    </>
  );
}
