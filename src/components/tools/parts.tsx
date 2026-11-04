"use client";

import { AlertCircle, ChevronDown, RotateCcw, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { parseNum } from "@/lib/tools/common";

/** Number field with an optional prefix or suffix, an inline message when the text is not a number, and a hint line. */
export function Field({ label, value, onChange, prefix, suffix, hint, placeholder, optional, id }: { label: string; value: string; onChange: (v: string) => void; prefix?: string; suffix?: string; hint?: string; placeholder?: string; optional?: boolean; id: string }) {
  const bad = value.trim() !== "" && parseNum(value) === null;
  return (
    <div>
      <label htmlFor={id} className="flex items-center justify-between gap-2 text-[13px] font-semibold text-soft">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-muted">Optional</span>}
      </label>
      <div className="relative mt-1.5">
        {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted" aria-hidden="true">{prefix}</span>}
        <input
          id={id}
          className="input num"
          style={{ paddingLeft: prefix ? 30 : undefined, paddingRight: suffix ? 52 : undefined, borderColor: bad ? "var(--down)" : undefined }}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          aria-invalid={bad}
          aria-describedby={`${id}-note`}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted" aria-hidden="true">{suffix}</span>}
      </div>
      <p id={`${id}-note`} className={`mt-1 min-h-4 text-xs ${bad ? "text-down" : "text-muted"}`}>{bad ? "Enter a number such as 1250.50." : hint ?? ""}</p>
    </div>
  );
}

/** Two-column frame: inputs with a Reset button on one side, live results on the other. */
export function CalcFrame({ title = "Your numbers", form, onReset, canReset, children }: { title?: string; form: ReactNode; onReset: () => void; canReset: boolean; children: ReactNode }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="card space-y-4 p-5" aria-label="Inputs">
        <div className="flex items-center justify-between gap-3">
          <h2 className="h3">{title}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onReset} disabled={!canReset}><RotateCcw size={14} aria-hidden="true" /> Reset</button>
        </div>
        {form}
      </section>
      <section className="card card-lit min-h-[220px] space-y-4 p-5" aria-live="polite" aria-label="Results">
        {children}
      </section>
    </div>
  );
}

/** Shows what is missing, what is wrong, or the finished results, in that order of priority. */
export function Outcome({ missing, errors, children }: { missing: string[]; errors: string[]; children: ReactNode }) {
  if (missing.length > 0) {
    return (
      <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 text-center">
        <span className="icon-tile fx-float grid h-12 w-12 place-items-center rounded-2xl"><Sparkles size={22} aria-hidden="true" /></span>
        <p className="text-sm text-soft">Results appear here as you type.</p>
        <p className="text-xs text-muted">Still needed: {missing.join(", ")}</p>
      </div>
    );
  }
  if (errors.length > 0) {
    return (
      <ul className="space-y-2" role="alert">
        {errors.map((e) => (
          <li key={e} className="fx-pop flex items-start gap-2.5 rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--down)_35%,transparent)] bg-[color-mix(in_srgb,var(--down)_9%,transparent)] px-3.5 py-3 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-down" aria-hidden="true" />
            <span>{e}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <div className="fx-fade space-y-4">{children}</div>;
}

/** One result tile. `tone` colours the value green or red for gains and losses. */
export function Metric({ label, children, tone, big, note }: { label: string; children: ReactNode; tone?: "up" | "down" | null; big?: boolean; note?: string }) {
  return (
    <div className={`card-flat min-w-0 p-3.5 ${big ? "sm:col-span-2" : ""}`}>
      <p className="eyebrow !text-muted">{label}</p>
      <p className={`num mt-1.5 break-words font-bold tracking-tight ${big ? "text-3xl md:text-4xl" : "text-xl"} ${tone === "up" ? "text-up" : tone === "down" ? "text-down" : ""}`}>{children}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

/** Collapsible plain-language explanation with the formulas used. */
export function HowItWorks({ children }: { children: ReactNode }) {
  return (
    <details className="card group mt-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="h3">How this is calculated</span>
        <ChevronDown size={18} className="text-muted transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-3 border-t border-line px-5 py-4 text-sm leading-relaxed text-soft [&_code]:rounded [&_code]:bg-[var(--surface-3)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-text">{children}</div>
    </details>
  );
}

/** Returns the labels of required fields that are still empty. */
export function missingFields(fields: Array<[string, string]>): string[] {
  return fields.filter(([, v]) => parseNum(v) === null).map(([label]) => label);
}
