"use client";

import { useEffect, useRef, useState } from "react";
import { priceUsd as fmtPrice } from "@/lib/utils/format";

const memo = new Map<string, number[] | null>();
let active = 0;
const waiting: Array<() => void> = [];

/** At most two trend requests in flight, so a long list never trips the provider rate limit. */
async function load(network: string, pool: string): Promise<number[] | null> {
  const key = `${network}:${pool}`;
  if (memo.has(key)) return memo.get(key) ?? null;
  if (active >= 2) await new Promise<void>((r) => waiting.push(r));
  active++;
  try {
    const res = await fetch(`/api/spark?network=${network}&pool=${encodeURIComponent(pool)}`);
    const json = res.ok ? ((await res.json()) as { points: number[] }) : null;
    const points = json && json.points.length >= 4 ? json.points : null;
    if (res.ok) memo.set(key, points);
    return points;
  } catch {
    return null;
  } finally {
    active--;
    waiting.shift()?.();
  }
}

/** 7 day trend from real pool candles. Draws nothing, not a made up line, when data is unavailable. */
export function Sparkline({ network, pool, width = 96, height = 32 }: { network: string; pool: string; width?: number; height?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [points, setPoints] = useState<number[] | null>(memo.get(`${network}:${pool}`) ?? null);
  useEffect(() => {
    const el = ref.current;
    if (!el || points) return;
    let live = true;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      void load(network, pool).then((p) => live && setPoints(p));
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => {
      live = false;
      io.disconnect();
    };
  }, [network, pool, points]);

  if (!points) return <span ref={ref} style={{ width, height }} className="inline-block" aria-hidden="true" />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const xy = points.map((v, i) => [i * step, 2 + (height - 4) * (1 - (v - min) / span)] as const);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const up = (points.at(-1) ?? 0) >= (points[0] ?? 0);
  const color = up ? "var(--up)" : "var(--down)";
  const id = `sp-${network}-${pool}`.replace(/[^A-Za-z0-9]/g, "");
  return (
    <svg
      ref={ref as never}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={up ? "7 day trend, up" : "7 day trend, down"}
      className="spark-draw overflow-visible"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setHover(Math.max(0, Math.min(points.length - 1, Math.round(((e.clientX - r.left) / r.width) * (points.length - 1)))));
      }}
      onPointerLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      {hover !== null && xy[hover] && (
        <g className="spark-scrub">
          <line x1={xy[hover][0]} x2={xy[hover][0]} y1="0" y2={height} stroke="var(--line-3)" strokeWidth="1" />
          <circle cx={xy[hover][0]} cy={xy[hover][1]} r="3" fill={color} />
          <text x={Math.min(Math.max(xy[hover][0], 16), width - 16)} y="-4" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text)" className="num">{fmtPrice(points[hover] ?? 0)}</text>
        </g>
      )}
    </svg>
  );
}
