"use client";

import { fmtPct, fmtPrice, fmtQty, fmtUsd, parseNum } from "@/lib/tools/common";
import { profitAndLoss } from "@/lib/tools/pnl";
import { Bars } from "./Bars";
import { ScenarioBar } from "@/components/engage/ScenarioBar";
import { useCalcInputs } from "./useCalcInputs";
import { LiveNumber } from "./LiveNumber";
import { CalcFrame, Field, HowItWorks, Metric, missingFields, Outcome } from "./parts";

const EMPTY = { entry: "", exit: "", amount: "", fees: "" };

export function PnlCalc() {
  const calc = useCalcInputs("profit-loss", EMPTY);
  const f = calc.values;
  const set = calc.set;
  const r = profitAndLoss({ entry: parseNum(f.entry), exit: parseNum(f.exit), amount: parseNum(f.amount), fees: parseNum(f.fees) });
  const missing = missingFields([["entry price", f.entry], ["exit price", f.exit], ["amount", f.amount]]);
  const tone = r.ok ? (r.value.pnl > 0 ? "up" : r.value.pnl < 0 ? "down" : null) : null;
  return (
    <>
      <CalcFrame
        onReset={calc.reset}
        canReset={calc.dirty}
        toolbar={<ScenarioBar calc={calc} />}
        form={
          <>
            <Field id="pnl-entry" label="Entry price" prefix="$" value={f.entry} onChange={set("entry")} placeholder="0.00" hint="What you paid for one unit." />
            <Field id="pnl-exit" label="Exit price" prefix="$" value={f.exit} onChange={set("exit")} placeholder="0.00" hint="What you sold, or would sell, one unit for." />
            <Field id="pnl-amount" label="Amount" suffix="units" value={f.amount} onChange={set("amount")} placeholder="0" hint="How many tokens or coins." />
            <Field id="pnl-fees" label="Total fees" prefix="$" optional value={f.fees} onChange={set("fees")} placeholder="0.00" hint="Trading, network and swap fees, buy and sell together." />
          </>
        }
      >
        <Outcome missing={missing} errors={r.ok ? [] : r.errors}>
          {r.ok && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric big tone={tone} label={r.value.pnl >= 0 ? "Profit" : "Loss"}><LiveNumber value={r.value.pnl} format={(n) => fmtUsd(n)} /></Metric>
                <Metric tone={tone} label="Return"><LiveNumber value={r.value.pct} format={(n) => fmtPct(n, true)} /></Metric>
                <Metric label="Break-even exit" note="The exit price where you neither win nor lose."><LiveNumber value={r.value.breakEven} format={fmtPrice} /></Metric>
                <Metric label="Cost"><LiveNumber value={r.value.cost} format={fmtUsd} /></Metric>
                <Metric label="Proceeds"><LiveNumber value={r.value.proceeds} format={fmtUsd} /></Metric>
              </div>
              <Bars items={[
                { label: "Paid in (cost + fees)", value: r.value.cost + r.value.fees, text: fmtUsd(r.value.cost + r.value.fees), tone: "warm" },
                { label: "Taken out", value: r.value.proceeds, text: fmtUsd(r.value.proceeds), tone: r.value.pnl >= 0 ? "up" : "down" },
              ]} />
              <p className="text-xs text-muted">{fmtQty(parseNum(f.amount) ?? 0)} units, fees {fmtUsd(r.value.fees)}.</p>
            </>
          )}
        </Outcome>
      </CalcFrame>
      <HowItWorks>
        <p>Cost is <code>entry price x amount</code>. Proceeds are <code>exit price x amount</code>.</p>
        <p>Profit or loss is <code>proceeds - cost - fees</code>. The return is that figure divided by your cost, shown as a percentage.</p>
        <p>The break-even exit is <code>(cost + fees) / amount</code>: the price you need to sell at just to cover what you paid and the fees.</p>
      </HowItWorks>
    </>
  );
}
