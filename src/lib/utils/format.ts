const COMPACT = [
  { v: 1e12, s: "T" },
  { v: 1e9, s: "B" },
  { v: 1e6, s: "M" },
  { v: 1e3, s: "K" },
];

const trimZeros = (s: string) => (s.includes(".") ? s.replace(/\.?0+$/, "") : s);
const scaled = (n: number) => trimZeros(Math.abs(n) >= 100 ? n.toFixed(0) : Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(2));

/** $1.45K, $2.8M, $1.25B. Null renders as the no-value dash. */
export function usdCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  for (const { v, s } of COMPACT) {
    if (abs >= v) return `$${scaled(n / v)}${s}`;
  }
  return abs < 1 ? `$${abs.toPrecision(3)}` : `$${abs.toFixed(2)}`;
}

/** Token prices need adaptive precision. */
export function priceUsd(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toPrecision(3)}`;
}

export function pct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  if (Math.abs(n) >= 10_000) return `${sign}${usdCompact(n).replace("$", "")}%`;
  return `${sign}${n.toFixed(digits)}%`;
}

export function ageShort(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const ms = now - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 60 ? `${d}d` : `${Math.floor(d / 30)}mo`;
}

export function shortAddress(a: string): string {
  return a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}
