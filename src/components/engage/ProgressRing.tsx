/** Circular progress. The arc draws in on first paint and glides when the value changes. */
export function ProgressRing({ value, total, size = 72, stroke = 7, label }: { value: number; total: number; size?: number; stroke?: number; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={frac >= 1 ? "var(--up)" : "var(--brand)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          className="ring-arc"
          style={{ ["--ring-start" as string]: c } as React.CSSProperties}
        />
      </svg>
      <span className="num absolute inset-0 grid place-items-center text-sm font-bold">{value}<span className="text-xs font-medium text-muted">/{total}</span></span>
    </div>
  );
}
