/** Horizontal comparison bars scaled to the largest value. Each bar grows in once. */
export function Bars({ items }: { items: Array<{ label: string; value: number; text: string; tone?: "up" | "down" | "brand" | "warm" }> }) {
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 0) || 1;
  const color = { up: "var(--up)", down: "var(--down)", brand: "var(--brand)", warm: "var(--warm)" };
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="text-muted">{i.label}</span>
            <span className="num font-semibold text-soft">{i.text}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${Math.max(2, (Math.abs(i.value) / max) * 100)}%`, background: color[i.tone ?? "brand"] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
