"use client";

import { useState } from "react";
import { fmtMultiple, fmtPct, fmtPrice, fmtQty, parseNum } from "@/lib/tools/common";
import { marketCapWhatIf } from "@/lib/tools/marketcap";
import { LiveNumber } from "./LiveNumber";
import { CalcFrame, Field, HowItWorks, Metric, missingFields, Outcome } from "./parts";

const EMPTY = { price: "", current: "", target: "" };

export function MarketCapCalc() {
  const [f, setF] = useState(EMPTY);
  const [basis, setBasis] = useState<"Market cap" | "FDV">("Market cap");
  const set = (k: keyof typeof EMPTY) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const r = marketCapWhatIf({ price: parseNum(f.price), current: parseNum(f.current), target: parseNum(f.target) });
  const missing = missingFields([["current price", f.price], [`current ${basis.toLowerCase()}`, f.current], [`target ${basis.toLowerCase()}`, f.target]]);
  const tone = r.ok ? (r.value.multiple > 1 ? "up" : r.value.multiple < 1 ? "down" : null) : null;
  return (
    <>
      <CalcFrame
        onReset={() => setF(EMPTY)}
        canReset={Object.values(f).some(Boolean)}
        form={
          <>
            <div role="group" aria-label="Measure by" className="flex gap-2">
              {(["Market cap", "FDV"] as const).map((b) => (
                <button key={b} type="button" className="chip" aria-pressed={basis === b} onClick={() => setBasis(b)}>{b}</button>
              ))}
            </div>
            <Field id="mc-price" label="Current price" prefix="$" value={f.price} onChange={set("price")} placeholder="0.00" />
            <Field id="mc-current" label={`Current ${basis.toLowerCase()}`} prefix="$" value={f.current} onChange={set("current")} placeholder="5000000" hint="Copy it from the token page or your data provider." />
            <Field id="mc-target" label={`Target ${basis.toLowerCase()}`} prefix="$" value={f.target} onChange={set("target")} placeholder="50000000" hint="The value you want to test, for example a larger project you compare it with." />
          </>
        }
      >
        <Outcome missing={missing} errors={r.ok ? [] : r.errors}>
          {r.ok && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric big tone={tone} label={`Implied price at target ${basis.toLowerCase()}`}><LiveNumber value={r.value.impliedPrice} format={(n) => `$${fmtPrice(n)}`} /></Metric>
              <Metric tone={tone} label="Multiple"><LiveNumber value={r.value.multiple} format={fmtMultiple} /></Metric>
              <Metric tone={tone} label="Price change"><LiveNumber value={r.value.changePct} format={(n) => fmtPct(n, true)} /></Metric>
              <Metric label="Supply implied by your inputs" note="Current cap divided by current price."><LiveNumber value={r.value.impliedSupply} format={(n) => fmtQty(n, 0)} /></Metric>
            </div>
          )}
        </Outcome>
      </CalcFrame>
      <HowItWorks>
        <p>The multiple is <code>target / current</code>. The implied price is <code>current price x multiple</code>.</p>
        <p>This assumes the amount of supply stays the same. If new tokens unlock or are minted, the real price at that cap would be lower. Fully diluted value (FDV) counts every token that will ever exist, so use it when you want to include future supply.</p>
        <p>A target cap tells you what a price would be at that size. It says nothing about whether the token will get there.</p>
      </HowItWorks>
    </>
  );
}
