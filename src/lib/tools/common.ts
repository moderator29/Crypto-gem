/** Shared helpers for the trader calculators. Everything here is pure and works on what the person typed. */

/** Largest magnitude the calculators accept. Beyond this, results lose meaning in double precision. */
export const MAX_INPUT = 1e18;

export type Calc<T> = { ok: true; value: T } | { ok: false; errors: string[] };

/** Parse a typed number. Accepts commas as thousands separators. Returns null for empty or unusable text. */
export function parseNum(text: string): number | null {
  const t = text.trim().replace(/,/g, "");
  if (t === "" || t === "-" || t === "." || t === "+") return null;
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Parse a list of numbers separated by commas, spaces, semicolons or new lines. Returns null if any token is not a number. */
export function parseList(text: string): number[] | null {
  const parts = text.split(/[\s,;]+/).filter(Boolean);
  if (parts.length === 0) return [];
  const out: number[] = [];
  for (const p of parts) {
    const n = parseNum(p);
    if (n === null) return null;
    out.push(n);
  }
  return out;
}

/** True when the value is a finite number inside the supported range. */
export function usable(n: number | null): n is number {
  return n !== null && Number.isFinite(n) && Math.abs(n) <= MAX_INPUT;
}

/** Format dollars. Small values keep significant digits, huge values switch to exponent form. */
export function fmtUsd(n: number): string {
  if (!Number.isFinite(n)) return "-";
  const a = Math.abs(n);
  if (a >= 1e15) return `${n < 0 ? "-" : ""}$${a.toExponential(3)}`;
  const sign = n < 0 ? "-" : "";
  if (a >= 1) return `${sign}$${a.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (a === 0) return "$0.00";
  return `${sign}$${a.toLocaleString("en-US", { maximumSignificantDigits: 4 })}`;
}

/** Format a unit price, which can be tiny. */
export function fmtPrice(n: number): string {
  if (!Number.isFinite(n)) return "-";
  const a = Math.abs(n);
  if (a >= 1e15) return `${n < 0 ? "-" : ""}${a.toExponential(3)}`;
  if (a >= 1) return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  if (a === 0) return "0";
  return n.toLocaleString("en-US", { maximumSignificantDigits: 4 });
}

/** Format a plain quantity such as a token amount. */
export function fmtQty(n: number, maxFraction = 6): string {
  if (!Number.isFinite(n)) return "-";
  if (Math.abs(n) >= 1e15) return n.toExponential(3);
  return n.toLocaleString("en-US", { maximumFractionDigits: maxFraction });
}

/** Format a percentage value that is already in percent units, with an explicit sign when asked. */
export function fmtPct(n: number, signed = false): string {
  if (!Number.isFinite(n)) return "-";
  if (Math.abs(n) >= 1e12) return `${n < 0 ? "-" : signed ? "+" : ""}${Math.abs(n).toExponential(2)}%`;
  const s = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${signed && n > 0 ? "+" : ""}${s}%`;
}

/** Format a multiple such as 2.5x. */
export function fmtMultiple(n: number): string {
  if (!Number.isFinite(n)) return "-";
  if (Math.abs(n) >= 1e9) return `${n.toExponential(2)}x`;
  return `${n.toLocaleString("en-US", { maximumFractionDigits: n >= 100 ? 0 : 2 })}x`;
}
