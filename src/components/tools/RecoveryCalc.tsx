"use client";

import { useState } from "react";
import { fmtMultiple, fmtPct, parseNum } from "@/lib/tools/common";
import { percentChange, recoveryGain } from "@/lib/tools/recovery";
import { Bars } from "./Bars";
import { LiveNumber } from "./LiveNumber";
import { CalcFrame, Field, HowItWorks, Metric, missingFields, Outcome } from "./parts";

const EMPTY = { loss: "", from: "", to: "" };

export function RecoveryCalc() {
  const [f, setF] = useState(EMPTY);
  const [mode, setMode] = useState<"recover" | "move">("recover");
  const set = (k: keyof typeof EMPTY) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const rec = recoveryGain(parseNum(f.loss));
  const mov = percentChange(parseNum(f.from), parseNum(f.to));
  const missing = mode === "recover" ? missingFields([["loss %", f.loss]]) : missingFields([["starting price", f.from], ["new price", f.to]]);
  const errors = mode === "recover" ? (rec.ok ? [] : rec.errors) : mov.ok ? [] : mov.errors;
  return (
    <>
      <CalcFrame
        onReset={() => setF(EMPTY)}
        canReset={Object.values(f).some(Boolean)}
        form={
          <>
            <div role="group" aria-label="What to work out" className="flex flex-wrap gap-2">
              <button type="button" className="chip" aria-pressed={mode === "recover"} onClick={() => setMode("recover")}>Recover a loss</button>
              <button type="button" className="chip" aria-pressed={mode === "move"} onClick={() => setMode("move")}>Measure a move</button>
            </div>
            {mode === "recover" ? (
              <Field id="rc-loss" label="Loss so far" suffix="%" value={f.loss} onChange={set("loss")} placeholder="50" hint="How far the price is below where you started, from above 0 to under 100." />
            ) : (
              <>
                <Field id="rc-from" label="Starting price" prefix="$" value={f.from} onChange={set("from")} placeholder="0.00" />
                <Field id="rc-to" label="New price" prefix="$" value={f.to} onChange={set("to")} placeholder="0.00" />
              </>
            )}
          </>
        }
      >
        <Outcome missing={missing} errors={errors}>
          {mode === "recover" && rec.ok && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric big tone="up" label="Gain needed to break even"><LiveNumber value={rec.value.gainNeededPct} format={(n) => fmtPct(n, true)} /></Metric>
                <Metric tone="down" label="Loss so far"><LiveNumber value={rec.value.lossPct} format={(n) => fmtPct(-n)} /></Metric>
                <Metric label="Left of your money"><LiveNumber value={rec.value.remaining} format={(n) => fmtPct(n)} /></Metric>
              </div>
              <Bars items={[
                { label: "Loss", value: rec.value.lossPct, text: fmtPct(-rec.value.lossPct), tone: "down" },
                { label: "Gain needed to get back", value: rec.value.gainNeededPct, text: fmtPct(rec.value.gainNeededPct, true), tone: "up" },
              ]} />
              <p className="text-sm text-soft">Losses are harder to undo than they look: you need a bigger percentage gain on a smaller balance.</p>
            </>
          )}
          {mode === "move" && mov.ok && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric big tone={mov.value.changePct > 0 ? "up" : mov.value.changePct < 0 ? "down" : null} label="Change"><LiveNumber value={mov.value.changePct} format={(n) => fmtPct(n, true)} /></Metric>
                <Metric label="Multiple"><LiveNumber value={mov.value.multiple} format={fmtMultiple} /></Metric>
                <Metric label="Move needed to get back" note={mov.value.recoverPct === null ? "Not defined when the new price is zero." : undefined}>
                  {mov.value.recoverPct === null ? "-" : <LiveNumber value={mov.value.recoverPct} format={(n) => fmtPct(n, true)} />}
                </Metric>
              </div>
            </>
          )}
        </Outcome>
      </CalcFrame>
      <HowItWorks>
        <p>The change between two prices is <code>(new / start - 1) x 100</code>.</p>
        <p>After a loss of L percent you hold <code>1 - L/100</code> of your starting value. To get back to 1 you need to multiply by <code>1 / (1 - L/100)</code>, so the gain needed is <code>(1 / (1 - L/100) - 1) x 100</code>.</p>
        <p>That is why a 50% loss needs a 100% gain, and a 90% loss needs a 900% gain. A 100% loss cannot be recovered at all.</p>
      </HowItWorks>
    </>
  );
}
