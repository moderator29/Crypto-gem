import { ArrowDown, ArrowUp, Check } from "lucide-react";
import type { ReactNode } from "react";

/** Statistic tile: label, big value, optional change arrow and note. Pass a CountUp as `value` for the tick-up effect. */
export function Stat({ label, value, delta, note, icon }: { label: string; value: ReactNode; delta?: number | null; note?: string; icon?: ReactNode }) {
  return (
    <div className="card fx-spot-host flex flex-col gap-1.5 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow !text-muted">{label}</span>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <div className="num text-2xl font-bold tracking-tight md:text-3xl">{value}</div>
      <div className="flex items-center gap-2 text-xs">
        {delta !== undefined && delta !== null && (
          <span className={`inline-flex items-center gap-0.5 font-semibold ${delta >= 0 ? "text-up" : "text-down"}`}>
            {delta >= 0 ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />}
            {Math.abs(delta).toFixed(2)}%
          </span>
        )}
        {note && <span className="text-muted">{note}</span>}
      </div>
    </div>
  );
}

/** Horizontal meter with an animated fill. `value` is 0 to 100. */
export function Meter({ value, label, tone = "brand", className = "" }: { value: number; label?: string; tone?: "brand" | "up" | "down" | "warm"; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const color = { brand: "var(--brand)", up: "var(--up)", down: "var(--down)", warm: "var(--warm)" }[tone];
  return (
    <div className={className} role="meter" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div className="fx-fill h-full rounded-full" style={{ width: `${v}%`, background: color, boxShadow: `0 0 10px ${color}` }} />
      </div>
    </div>
  );
}

/** Round avatar. With no image, a gradient chosen from the text so the same person always gets the same colours. */
export function Avatar({ text, src, size = 40 }: { text: string; src?: string | null; size?: number }) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-full font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.4, background: `linear-gradient(135deg, hsl(${h} 80% 58%), hsl(${(h + 40) % 360} 75% 42%))` }}>
      {text.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Numbered progress steps for multi-step flows. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((s, i) => {
        const done = i < current;
        const on = i === current;
        return (
          <li key={s} aria-current={on ? "step" : undefined} className="flex min-w-0 flex-1 items-center gap-2">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${done ? "bg-[var(--up)] text-black" : on ? "bg-[var(--brand)] text-white shadow-[0_0_14px_var(--neon-glow)]" : "bg-[var(--surface-3)] text-muted"}`}>{done ? <Check size={14} /> : i + 1}</span>
            <span className={`hidden truncate text-sm font-semibold sm:block ${on ? "text-text" : "text-muted"}`}>{s}</span>
            {i < steps.length - 1 && <span className={`h-px flex-1 ${done ? "bg-[var(--up)]" : "bg-[var(--line-2)]"}`} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
