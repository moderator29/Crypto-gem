"use client";

import { Link2 } from "lucide-react";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChainBadge } from "@/components/ui/ChainBadge";
import { useToast } from "@/components/ui/Toast";
import { changeOf, extent, fullScale, heatIntensity, mapTiles, WINDOW_LABEL, type ChangeWindow, type MapTile, type SizeBy } from "@/lib/market-data/analytics";
import { getNetwork } from "@/lib/market-data/networks";
import type { PoolSummary } from "@/lib/market-data/types";
import { pct, usdCompact } from "@/lib/utils/format";
import { ChainFilter } from "./ChainFilter";

interface Rect { x: number; y: number; w: number; h: number }

const WINDOWS: ChangeWindow[] = ["h1", "h6", "h24"];
const SIZES: Array<{ id: SizeBy; label: string }> = [{ id: "volume", label: "Volume" }, { id: "liquidity", label: "Liquidity" }];

/** Tile fill: the up or down colour mixed into a dark base in proportion to the move, so white text always reads. */
function tileFill(change: number, w: ChangeWindow): string {
  const i = heatIntensity(change, w);
  const strength = Math.round(12 + Math.abs(i) * 46);
  return `color-mix(in srgb, var(${i >= 0 ? "--up" : "--down"}) ${strength}%, var(--mk-tile-base))`;
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

type Dir = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

/** The tile whose centre is nearest in the pressed direction, so arrow keys move across the map the way eyes do. */
function neighbour(rects: Rect[], from: number, key: Dir): number {
  const a = rects[from];
  if (!a) return from;
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  let best = from;
  let bestScore = Infinity;
  rects.forEach((r, i) => {
    if (i === from || r.w <= 0) return;
    const dx = r.x + r.w / 2 - ax;
    const dy = r.y + r.h / 2 - ay;
    const along = key === "ArrowLeft" ? -dx : key === "ArrowRight" ? dx : key === "ArrowUp" ? -dy : dy;
    if (along <= 1) return;
    const across = key === "ArrowLeft" || key === "ArrowRight" ? Math.abs(dy) : Math.abs(dx);
    const score = along + across * 2;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

export interface MapView { w?: ChangeWindow; s?: SizeBy; n?: string | null }

const isWindow = (v: string | null): v is ChangeWindow => v === "h1" || v === "h6" || v === "h24";
const isSize = (v: string | null): v is SizeBy => v === "volume" || v === "liquidity";

/** Reads a shared map view from the address. Unknown values fall back to the defaults. */
export function parseMapView(q: URLSearchParams): MapView {
  const w = q.get("w");
  const s = q.get("s");
  const n = q.get("n");
  return { w: isWindow(w) ? w : undefined, s: isSize(s) ? s : undefined, n: n && getNetwork(n) ? n : null };
}

function Tip({ tile, rect, box, w }: { tile: MapTile; rect: Rect; box: { w: number; h: number }; w: ChangeWindow }) {
  const p = tile.pool;
  const width = Math.min(260, box.w - 16);
  const left = Math.max(8, Math.min(box.w - width - 8, rect.x + rect.w / 2 - width / 2));
  const below = rect.y < box.h / 2;
  const top = below ? rect.y + rect.h + 8 : rect.y - 8;
  const rows: Array<[string, string]> = [["24h volume", usdCompact(p.volumeUsd.h24)], ["Liquidity", usdCompact(p.liquidityUsd)], ["1h", pct(p.change.h1, 2)], ["6h", pct(p.change.h6, 2)], ["24h", pct(p.change.h24, 2)]];
  return (
    <div role="tooltip" className="mk-tip glass-float" style={{ left, top, width, transform: below ? undefined : "translateY(-100%)" }}>
      <div className="flex items-center gap-2">
        <ChainBadge networkId={p.networkId} size={18} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight">{p.baseToken.name || p.baseToken.symbol}</p>
          <p className="truncate text-[11px] uppercase text-muted">{p.baseToken.symbol} on {getNetwork(p.networkId)?.name ?? p.networkId}</p>
        </div>
        <span className={`num text-sm font-bold ${tile.change >= 0 ? "text-up" : "text-down"}`}>{pct(tile.change, 2)}</span>
      </div>
      <dl className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className={k === WINDOW_LABEL[w] ? "font-semibold text-text" : "text-muted"}>{k}</dt>
            <dd className="num text-right font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ id: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="mk-seg">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className="mk-seg-btn">{o.label}</button>
      ))}
    </div>
  );
}

/**
 * Price map: tile area is volume or liquidity, colour is the 1h, 6h or 24h change. Tiles ease in with a stagger and
 * between layouts, show a rich tooltip on hover or focus, and open the token on click. Arrow keys move between tiles.
 */
export function HeatMap({ pools, syncUrl = false, initial }: { pools: PoolSummary[]; height?: number; syncUrl?: boolean; initial?: MapView }) {
  const toast = useToast();
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [win, setWin] = useState<ChangeWindow>(initial?.w ?? "h24");
  const [by, setBy] = useState<SizeBy>(initial?.s ?? "volume");
  const [network, setNetwork] = useState<string | null>(initial?.n ?? null);
  const [active, setActive] = useState<string | null>(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const hasTiles = useMemo(() => mapTiles(pools, win, by, network, 1).length > 0, [pools, win, by, network]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasTiles]);

  const choose = useCallback((fn: () => void) => {
    fn();
    setActive(null);
    setFocusIdx(0);
    setEpoch((e) => e + 1);
  }, []);

  const query = useMemo(() => {
    const q = new URLSearchParams();
    if (win !== "h24") q.set("w", win);
    if (by !== "volume") q.set("s", by);
    if (network) q.set("n", network);
    const str = q.toString();
    return str ? `?${str}` : "";
  }, [win, by, network]);

  useEffect(() => {
    if (!syncUrl) return;
    window.history.replaceState(null, "", `${window.location.pathname}${query}`);
  }, [syncUrl, query]);

  const chainOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of pools) counts.set(p.networkId, (counts.get(p.networkId) ?? 0) + 1);
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, label: getNetwork(id)?.name ?? id, count }));
    return [{ id: null as string | null, label: "All chains", count: pools.length }, ...rows];
  }, [pools]);

  const tiles = useMemo(() => mapTiles(pools, win, by, network), [pools, win, by, network]);
  const rects = useMemo(() => (size.w && size.h ? squarify(tiles.map((t) => t.size), { x: 0, y: 0, w: size.w, h: size.h }) : []), [tiles, size]);
  const range = useMemo(() => extent(mapTiles(pools, win, by, network, 200).map((t) => t.change)), [pools, win, by, network]);
  const activeIdx = active ? tiles.findIndex((t) => t.pool.id === active) : -1;
  const activeRect = activeIdx >= 0 ? rects[activeIdx] : undefined;
  const refs = useRef<Array<HTMLAnchorElement | null>>([]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const next = neighbour(rects, focusIdx, e.key as Dir);
    setFocusIdx(next);
    refs.current[next]?.focus();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}${query}`);
      toast.success("Link to this view copied");
    } catch {
      toast.error("Could not copy", "Copy the address from the browser bar instead.");
    }
  };

  const sampleCount = mapTiles(pools, win, by, network, 1000).length;
  const small = size.w > 0 && size.w < 560;

  return (
    <div className="card mk-map-card">
      <div className="mk-map-head">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Price map</h3>
          <p className="text-[11px] text-muted">Sized by {by === "volume" ? "24h volume" : "liquidity"}, coloured by {WINDOW_LABEL[win]} change</p>
        </div>
        <button type="button" className="btn btn-sm btn-icon ml-auto" onClick={() => void copyLink()} aria-label="Copy link to this view" title="Copy link to this view"><Link2 size={15} aria-hidden="true" /></button>
      </div>
      <div className="mk-controls">
        <Segmented label="Colour by change over" value={win} options={WINDOWS.map((w) => ({ id: w, label: WINDOW_LABEL[w] }))} onChange={(v) => choose(() => setWin(v))} />
        <Segmented label="Size tiles by" value={by} options={SIZES} onChange={(v) => choose(() => setBy(v))} />
        <ChainFilter options={chainOptions} value={network} onChange={(id) => choose(() => setNetwork(id))} />
      </div>
      <div className="p-2 pt-0 sm:p-3 sm:pt-0">
        {tiles.length === 0 ? (
          <p className="grid place-items-center py-16 text-center text-sm text-muted">{pools.length === 0 ? "Map data is unavailable right now." : `No pools with ${WINDOW_LABEL[win]} change and ${by} data${network ? " on this chain" : ""}.`}</p>
        ) : (
          <>
            <div ref={box} className="mk-map" onKeyDown={onKey} role="group" aria-label="Price map tiles. Use arrow keys to move between tiles." onPointerLeave={() => setActive(null)}>
              <Fragment key={`${win}-${by}-${network ?? "all"}-${epoch}`}>
              {tiles.map((t, i) => {
                const r = rects[i];
                if (!r || r.w <= 0 || r.h <= 0) return null;
                const p = t.pool;
                const fs = Math.max(9, Math.min(small ? 24 : 20, Math.sqrt(r.w * r.h) / (small ? 4.2 : 5.2)));
                const showName = r.w > 36 && r.h > 26;
                const showPct = r.w > 40 && r.h > 40;
                const showSize = r.w > 76 && r.h > 66;
                return (
                  <Link
                    key={p.id}
                    ref={(el) => { refs.current[i] = el; }}
                    href={`/token/${p.networkId}/${p.baseToken.address}`}
                    tabIndex={i === focusIdx ? 0 : -1}
                    aria-label={`${p.baseToken.name || p.baseToken.symbol}, ${pct(t.change, 2)} over ${WINDOW_LABEL[win]}, ${usdCompact(p.volumeUsd.h24)} volume`}
                    className="mk-tile"
                    data-active={active === p.id ? "true" : undefined}
                    style={{ left: r.x, top: r.y, width: r.w, height: r.h, background: tileFill(t.change, win), ["--i" as string]: i, fontSize: fs }}
                    onPointerEnter={() => setActive(p.id)}
                    onFocus={() => { setActive(p.id); setFocusIdx(i); }}
                    onBlur={() => setActive((a) => (a === p.id ? null : a))}
                  >
                    {showName && <span className="mk-sym">{p.baseToken.symbol}</span>}
                    {showPct && <span className="num mk-pct">{pct(t.change, r.w > 88 ? 2 : 1)}</span>}
                    {showSize && <span className="num mk-vol">{usdCompact(t.size)}</span>}
                  </Link>
                );
              })}
              </Fragment>
              {activeIdx >= 0 && activeRect && tiles[activeIdx] && <Tip tile={tiles[activeIdx]} rect={activeRect} box={size} w={win} />}
            </div>
            <div className="mk-legend" aria-label="Colour legend">
              <span className="num">{range ? pct(range.min, 1) : "—"}</span>
              <span className="mk-legend-bar" aria-hidden="true" />
              <span className="num">{range ? pct(range.max, 1) : "—"}</span>
            </div>
            <p className="mt-1.5 px-1 text-[11px] text-muted">
              {tiles.length} of {sampleCount} pools shown. Legend shows the real range in view; colour is full strength at {fullScale(win)}% and beyond. Median {WINDOW_LABEL[win]} change {median(tiles.map((t) => changeOf(t.pool, win)))}.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function median(xs: Array<number | null>): string {
  const s = xs.filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (s.length === 0) return "—";
  const m = Math.floor(s.length / 2);
  return pct(s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2, 2);
}
