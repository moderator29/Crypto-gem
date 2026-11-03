"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PoolSummary } from "@/lib/market-data/types";
import { pct, usdCompact } from "@/lib/utils/format";

interface Rect { x: number; y: number; w: number; h: number }

/** Discrete diverging scale: every readable tile also prints its percentage, so colour is never the only cue. */
function tileColor(change: number): string {
  if (change >= 20) return "#047857";
  if (change >= 5) return "#059669";
  if (change >= 1) return "#1f7a5c";
  if (change > -1) return "#31384f";
  if (change > -5) return "#8f3340";
  if (change > -20) return "#b23a48";
  return "#d1394a";
}

/** Squarified treemap (Bruls, Huizing, van Wijk): area stays proportional to value while tiles stay near square. */
function squarify(values: number[], bounds: Rect): Rect[] {
  const total = values.reduce((s, v) => s + v, 0);
  if (total <= 0) return values.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));
  const scaled: number[] = values.map((v) => (v / total) * bounds.w * bounds.h);
  const out: Rect[] = new Array<Rect>(values.length);
  const rect = { ...bounds };
  const worst = (row: number[], side: number) => {
    const sum = row.reduce((s, v) => s + v, 0);
    const s2 = side * side;
    return Math.max((s2 * Math.max(...row)) / (sum * sum), (sum * sum) / (s2 * Math.min(...row)));
  };
  const place = (row: number[], start: number) => {
    const sum = row.reduce((s, v) => s + v, 0);
    if (rect.w >= rect.h) {
      const rw = sum / rect.h;
      let y = rect.y;
      row.forEach((v, i) => { const h = (v / sum) * rect.h; out[start + i] = { x: rect.x, y, w: rw, h }; y += h; });
      rect.x += rw;
      rect.w -= rw;
    } else {
      const rh = sum / rect.w;
      let x = rect.x;
      row.forEach((v, i) => { const w = (v / sum) * rect.w; out[start + i] = { x, y: rect.y, w, h: rh }; x += w; });
      rect.y += rh;
      rect.h -= rh;
    }
  };
  let idx = 0;
  while (idx < scaled.length) {
    let row: number[] = [];
    const start = idx;
    while (idx < scaled.length) {
      const next = [...row, scaled[idx] as number];
      if (row.length > 0 && worst(next, Math.min(rect.w, rect.h)) > worst(row, Math.min(rect.w, rect.h))) break;
      row = next;
      idx++;
    }
    place(row, start);
  }
  return out;
}

/** Price map: tile size is 24h volume, colour is 24h change. Every tile links to its token page. */
export function HeatMap({ pools, height = 420 }: { pools: PoolSummary[]; height?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const tiles = useMemo(() => pools.filter((p) => (p.volumeUsd.h24 ?? 0) > 0 && p.change.h24 !== null).sort((a, b) => (b.volumeUsd.h24 ?? 0) - (a.volumeUsd.h24 ?? 0)).slice(0, 40), [pools]);
  const rects = useMemo(() => (size.w && size.h ? squarify(tiles.map((p) => p.volumeUsd.h24 ?? 0), { x: 0, y: 0, w: size.w, h: size.h }) : []), [tiles, size]);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Price map</h3>
          <p className="text-[11px] text-muted">Sized by 24h volume, coloured by 24h change</p>
        </div>
        <div className="hidden items-center gap-3 text-[11px] text-muted sm:flex">
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: "#059669" }} /> Up</span>
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: "#31384f" }} /> Flat</span>
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: "#d1394a" }} /> Down</span>
        </div>
      </div>
      <div className="p-2">
        {tiles.length === 0 ? (
          <p className="grid place-items-center py-16 text-sm text-muted">Map data is unavailable right now.</p>
        ) : (
          <div ref={box} className="relative w-full overflow-hidden rounded-lg" style={{ height }}>
            {tiles.map((p, i) => {
              const r = rects[i];
              if (!r || r.w <= 0 || r.h <= 0) return null;
              const ch = p.change.h24 ?? 0;
              const readable = r.w > 46 && r.h > 34;
              const big = r.w > 88 && r.h > 60;
              return (
                <Link key={p.id} href={`/token/${p.networkId}/${p.baseToken.address}`} title={`${p.baseToken.name} | ${usdCompact(p.volumeUsd.h24)} volume | ${pct(ch, 2)}`} className="absolute flex flex-col items-center justify-center overflow-hidden p-0.5 text-white/95 transition hover:z-10 hover:brightness-125 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-white/70" style={{ left: r.x, top: r.y, width: r.w, height: r.h, background: tileColor(ch), boxShadow: "inset 0 0 0 1px rgba(5,8,22,0.55)" }}>
                  {readable && (
                    <>
                      <span className="max-w-full truncate font-bold leading-none" style={{ fontSize: big ? 14 : 11 }}>{p.baseToken.symbol}</span>
                      <span className="num mt-0.5 leading-none" style={{ fontSize: big ? 12 : 9.5 }}>{pct(ch, big ? 2 : 1)}</span>
                      {big && <span className="num mt-0.5 leading-none text-white/70" style={{ fontSize: 9.5 }}>{usdCompact(p.volumeUsd.h24)}</span>}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
