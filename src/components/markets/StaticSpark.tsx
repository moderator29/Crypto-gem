/** Sparkline from points already in hand (no request). Draws nothing when there are too few points. */
export function StaticSpark({ points, width = 84, height = 30 }: { points: number[]; width?: number; height?: number }) {
  if (points.length < 4) return <span style={{ width, height }} className="inline-block" aria-hidden="true" />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const d = points.map((v, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${(2 + (height - 4) * (1 - (v - min) / span)).toFixed(1)}`).join(" ");
  const up = (points.at(-1) ?? 0) >= (points[0] ?? 0);
  const color = up ? "var(--up)" : "var(--down)";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={up ? "7 day trend, up" : "7 day trend, down"} className="spark-draw overflow-visible">
      <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
