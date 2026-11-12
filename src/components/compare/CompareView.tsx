"use client";

import { Plus, Trophy, TrendingDown, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShareButton } from "@/components/ui/ShareButton";
import { TokenLogo } from "@/components/ui/TokenLogo";
import {
  alignedIndex, compareQuery, extremes, MAX_COMPARE, parseCompareMode, parseCompareRange, parseCompareRefs, RANGE_POINTS, tail, toIndex, toPct,
  type CompareMode, type CompareRange, type CompareRef,
} from "@/lib/market-data/analytics";
import { sameAddress } from "@/lib/market-data/identifiers";
import { getNetwork } from "@/lib/market-data/networks";
import { priceUsd, usdCompact } from "@/lib/utils/format";

interface Hit { networkId: string; address: string; name: string; symbol: string; imageUrl: string | null; priceUsd: number | null; liquidityUsd: number | null; poolAddress: string }

const COLORS = ["#ff5a3c", "#5cc8ff", "#ffd24a", "#a78bfa", "#34d399"] as const;
const STEP_HOURS: Record<CompareRange, number> = { "24h": 1, "7d": 4 };
const PAD = 14;
const hitKey = (h: { networkId: string; address: string }) => `${h.networkId}:${h.address}`;

/** Raw closing prices for one token over a range. 7d uses the spark endpoint, 24h hourly candles. Null when the provider has none. */
async function fetchSeries(h: Hit, range: CompareRange): Promise<number[] | null> {
  const q = `network=${h.networkId}&pool=${encodeURIComponent(h.poolAddress)}`;
  try {
    if (range === "7d") {
      const r = await fetch(`/api/spark?${q}`);
      if (!r.ok) return null;
      const j = (await r.json()) as { points?: number[] };
      return j.points && j.points.length > 3 ? tail(j.points, RANGE_POINTS["7d"]) : null;
    }
    const r = await fetch(`/api/ohlcv?${q}&tf=1h`);
    if (!r.ok) return null;
    const j = (await r.json()) as { candles?: Array<{ close: number }> };
    const closes = (j.candles ?? []).map((c) => c.close).filter((n) => Number.isFinite(n) && n > 0);
    return closes.length > 3 ? tail(closes, RANGE_POINTS["24h"]) : null;
  } catch {
    return null;
  }
}

async function resolveRef(ref: CompareRef): Promise<Hit | null> {
  try {
    const r = await fetch(`/api/search?q=${encodeURIComponent(ref.address)}`);
    if (!r.ok) return null;
    const j = (await r.json()) as { results?: Hit[] };
    const rows = j.results ?? [];
    return rows.find((h) => h.networkId === ref.networkId && sameAddress(h.address, ref.address)) ?? rows.find((h) => h.networkId === ref.networkId) ?? null;
  } catch {
    return null;
  }
}

function timeAgo(slotsFromEnd: number, range: CompareRange): string {
  const h = slotsFromEnd * STEP_HOURS[range];
  if (h === 0) return "Latest";
  return h >= 48 ? `${(h / 24).toFixed(1)} days ago` : `${h}h ago`;
}

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ id: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="mk-seg">
      {options.map((o) => <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className="mk-seg-btn">{o.label}</button>)}
    </div>
  );
}

interface LineSet { raw: Array<number[] | null>; vals: Array<number[] | null>; length: number }

/** Multi-line chart in real pixels with animated strokes and a crosshair that reads every line at the same moment. */
function Chart({ lines, hits, mode, range, focus }: { lines: LineSet; hits: Hit[]; mode: CompareMode; range: CompareRange; focus: number | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [slot, setSlot] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { vals, length } = lines;
  const flat = vals.flat().filter((v): v is number => v !== null);
  const dataLo = mode === "index" ? 0 : Math.min(0, ...flat);
  const dataHi = mode === "index" ? 100 : Math.max(0, ...flat);
  const margin = mode === "index" ? 0 : (dataHi - dataLo || 1) * 0.08;
  const lo = dataLo - margin;
  const hi = dataHi + margin;
  const span = hi - lo || 1;
  const x = (s: number) => (length > 1 ? (s / (length - 1)) * size.w : 0);
  const y = (v: number) => PAD + (1 - (v - lo) / span) * (size.h - PAD * 2);
  const ticks = [0, 1, 2, 3, 4].map((i) => lo + (span * i) / 4);
  const fmt = (v: number) => (mode === "pct" ? `${v >= 0 ? "+" : ""}${v.toFixed(Math.abs(span) < 6 ? 1 : 0)}%` : v.toFixed(0));

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (length < 2) return;
    setSlot(Math.max(0, Math.min(length - 1, Math.round(((e.clientX - r.left) / r.width) * (length - 1)))));
  };
  const readout = slot === null ? [] : vals.map((v, i) => {
    const idx = v ? alignedIndex(v.length, length, slot) : null;
    return v && idx !== null ? { i, value: v[idx] as number, price: lines.raw[i]?.[idx] ?? null } : null;
  });
  const flip = slot !== null && slot > length * 0.55;

  return (
    <div ref={box} className="mk-chart" onPointerMove={onMove} onPointerLeave={() => setSlot(null)} onPointerCancel={() => setSlot(null)}>
      {size.w > 0 && (
        <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} role="img" aria-label={`${mode === "pct" ? "Percent change" : "Normalised index"} for ${hits.map((h) => h.symbol).join(", ")}`} className="block overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line x1="0" x2={size.w} y1={y(t)} y2={y(t)} stroke="var(--line-1)" />
              <text x="4" y={y(t) - 4} fontSize="10" fontWeight="600" fill="var(--text-muted)" className="num">{fmt(t)}</text>
            </g>
          ))}
          {mode === "pct" && <line x1="0" x2={size.w} y1={y(0)} y2={y(0)} stroke="var(--line-2)" strokeDasharray="4 4" />}
          {vals.map((v, i) => {
            if (!v) return null;
            const off = length - v.length;
            const d = v.map((n, k) => `${k ? "L" : "M"}${x(k + off).toFixed(1)},${y(n).toFixed(1)}`).join(" ");
            return <path key={`${hitKey(hits[i] as Hit)}-${mode}-${range}`} d={d} pathLength={1} fill="none" stroke={COLORS[i]} strokeWidth={focus === i ? 3.2 : 2.2} strokeLinejoin="round" strokeLinecap="round" opacity={focus === null || focus === i ? 1 : 0.2} className="spark-draw-line" style={{ transition: "opacity 160ms ease" }} />;
          })}
          {slot !== null && (
            <g>
              <line x1={x(slot)} x2={x(slot)} y1="0" y2={size.h} stroke="var(--text-muted)" strokeDasharray="3 3" />
              {readout.map((r) => r && <circle key={r.i} cx={x(slot)} cy={y(r.value)} r="4.5" fill={COLORS[r.i]} stroke="var(--surface-1)" strokeWidth="2" />)}
            </g>
          )}
        </svg>
      )}
      {slot !== null && (
        <div className="mk-readout glass-float" style={flip ? { right: 8 } : { left: 8 }}>
          <p className="text-[11px] font-semibold text-muted">{timeAgo(length - 1 - slot, range)}</p>
          {readout.map((r) => r && (
            <p key={r.i} className="flex items-center gap-2 text-xs">
              <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[r.i] }} />
              <span className="font-bold">{hits[r.i]?.symbol}</span>
              <span className="num ml-auto font-semibold">{mode === "pct" ? fmt(r.value) : r.value.toFixed(0)}</span>
              {r.price !== null && <span className="num hidden text-muted min-[420px]:inline">{priceUsd(r.price)}</span>}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Compare up to five tokens on one chart. Tokens, mode and range live in the URL so any view can be shared.
 * Lines come from real GeckoTerminal candles; a token without candles draws nothing.
 */
export function CompareView() {
  const params = useSearchParams();
  const [picked, setPicked] = useState<Hit[]>([]);
  const [resolving, setResolving] = useState<CompareRef[]>(() => parseCompareRefs({ t: params.get("t"), a: params.get("a") }));
  const [mode, setMode] = useState<CompareMode>(() => parseCompareMode(params.get("m")));
  const [range, setRange] = useState<CompareRange>(() => parseCompareRange(params.get("r")));
  const [series, setSeries] = useState<Record<string, number[] | null>>({});
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [focus, setFocus] = useState<number | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const refs = resolving;
    if (refs.length === 0) return;
    void Promise.all(refs.map(resolveRef)).then((found) => {
      setPicked(found.filter((h): h is Hit => h !== null));
      setResolving([]);
    });
  }, [resolving]);

  useEffect(() => {
    if (!started.current) return;
    const refs = picked.map((h) => ({ networkId: h.networkId, address: h.address }));
    if (resolving.length > 0 && refs.length === 0) return;
    window.history.replaceState(null, "", `${window.location.pathname}${compareQuery(refs, mode, range)}`);
  }, [picked, mode, range, resolving.length]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(q.trim())}`).then((r) => r.json()).then((j: { results?: Hit[] }) => setHits(j.results ?? [])).catch(() => setHits([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    for (const h of picked) {
      const key = `${hitKey(h)}|${range}`;
      if (key in series) continue;
      void fetchSeries(h, range).then((pts) => setSeries((s) => ({ ...s, [key]: pts })));
    }
  }, [picked, range, series]);

  const lines = useMemo<LineSet>(() => {
    const raw = picked.map((h) => series[`${hitKey(h)}|${range}`] ?? null);
    const vals = raw.map((p) => {
      if (!p) return null;
      const v = mode === "pct" ? toPct(p) : toIndex(p);
      return v.length > 0 ? v : null;
    });
    return { raw, vals, length: Math.max(0, ...vals.map((v) => v?.length ?? 0)) };
  }, [picked, series, range, mode]);

  const returns = useMemo(() => picked.map((_, i) => { const p = lines.raw[i]; const r = p ? toPct(p) : []; return r.length ? (r.at(-1) as number) : null; }), [picked, lines.raw]);
  const { best, worst } = extremes(returns);
  const loading = picked.some((h) => !(`${hitKey(h)}|${range}` in series));

  const add = useCallback((h: Hit) => {
    setPicked((p) => (p.length >= MAX_COMPARE || p.some((x) => x.networkId === h.networkId && sameAddress(x.address, h.address)) ? p : [...p, h]));
    setHits([]);
    setQ("");
  }, []);
  const candidates = hits.filter((h) => !picked.some((p) => p.networkId === h.networkId && sameAddress(p.address, h.address)));

  return (
    <div className="space-y-5">
      <div className="card space-y-3 p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Selected tokens">
          {picked.map((h, i) => (
            <span key={hitKey(h)} role="listitem" className="chip" style={{ borderColor: COLORS[i] }} onPointerEnter={() => setFocus(i)} onPointerLeave={() => setFocus(null)}>
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} /> {h.symbol}
              <button type="button" aria-label={`Remove ${h.symbol}`} onClick={() => setPicked(picked.filter((_, n) => n !== i))}><X size={13} /></button>
            </span>
          ))}
          {resolving.length > 0 && resolving.map((r) => <span key={hitKey(r)} className="skeleton h-9 w-24 rounded-full" aria-hidden="true" />)}
          {picked.length < MAX_COMPARE && (
            <div className="relative min-w-[200px] flex-1">
              <Plus size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                className="input !pl-9"
                placeholder={picked.length ? "Add another token" : "Search a token to compare"}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setQ(""); setHits([]); }
                  if (e.key === "Enter" && candidates[0]) add(candidates[0]);
                }}
                aria-label="Add a token"
                autoComplete="off"
              />
              {candidates.length > 0 && q.trim().length >= 2 && (
                <ul className="glass-float absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-y-auto !bg-[var(--surface-2)] py-1">
                  {candidates.map((h) => (
                    <li key={hitKey(h)}>
                      <button type="button" className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--surface-3)]" onClick={() => add(h)}>
                        <TokenLogo src={h.imageUrl} symbol={h.symbol} size={28} networkId={h.networkId} address={h.address} />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{h.name} <span className="font-medium text-muted">{h.symbol}</span></span>
                        <span className="text-xs text-muted">{getNetwork(h.networkId)?.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <p className="text-[11px] text-muted">{picked.length} of {MAX_COMPARE} tokens. Mode, range and tokens are saved in the page address, so the link you copy opens this exact view.</p>
      </div>

      {picked.length === 0 && resolving.length === 0 ? (
        <EmptyState title="Pick up to five tokens" description="Search above. You will see them on one chart, rebased so you can compare moves fairly. From any market list, use the compare button on a row." />
      ) : (
        <>
          <div className="card p-4 md:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="h3">{mode === "pct" ? `${range === "7d" ? "Last 7 days" : "Last 24 hours"}, change from start` : "Normalised index, window low 0 to high 100"}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Seg label="Chart mode" value={mode} options={[{ id: "pct", label: "% change" }, { id: "index", label: "Index" }]} onChange={setMode} />
                <Seg label="Time range" value={range} options={[{ id: "24h", label: "24h" }, { id: "7d", label: "7d" }]} onChange={setRange} />
                <ShareButton title="Token comparison" label="Share" />
              </div>
            </div>
            <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Legend">
              {picked.map((h, i) => (
                <li key={hitKey(h)}>
                  <button type="button" className="flex items-center gap-1.5 text-xs font-semibold" onPointerEnter={() => setFocus(i)} onPointerLeave={() => setFocus(null)} onFocus={() => setFocus(i)} onBlur={() => setFocus(null)}>
                    <i className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />{h.symbol}
                    <span className="num text-muted">{returns[i] === null ? "no data" : `${(returns[i] as number) >= 0 ? "+" : ""}${(returns[i] as number).toFixed(1)}%`}</span>
                  </button>
                </li>
              ))}
            </ul>
            {loading && lines.length === 0 ? (
              <div className="skeleton mk-chart" aria-busy="true" />
            ) : lines.length === 0 ? (
              <p className="grid h-40 place-items-center text-center text-sm text-muted">The provider has no candles for these tokens in this range.</p>
            ) : (
              <Chart lines={lines} hits={picked} mode={mode} range={range} focus={focus} />
            )}
            <p className="mt-2 text-xs text-muted">
              Source GeckoTerminal pool candles ({range === "7d" ? "4 hour" : "1 hour"} closes). Series are aligned at the latest point, so a newer pool starts later. A token with no candles shows no line. Hover or touch the chart to read every line at the same moment.
            </p>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <caption className="sr-only">Summary of the compared tokens</caption>
              <thead><tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted"><th className="px-3 py-3 md:px-4">Token</th><th className="hidden px-3 py-3 sm:table-cell md:px-4">Network</th><th className="px-3 py-3 md:px-4">Price</th><th className="hidden px-3 py-3 md:table-cell md:px-4">Liquidity</th><th className="px-3 py-3 text-right md:px-4">{range === "7d" ? "7d" : "24h"}</th></tr></thead>
              <tbody>
                {picked.map((h, i) => {
                  const r = returns[i] ?? null;
                  return (
                    <tr key={hitKey(h)} className="border-b border-line last:border-0">
                      <td className="px-3 py-3 md:px-4"><span className="flex min-w-0 items-center gap-2.5 font-semibold"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[i] }} /><TokenLogo src={h.imageUrl} symbol={h.symbol} size={26} networkId={h.networkId} address={h.address} /><span className="truncate">{h.symbol}</span></span></td>
                      <td className="hidden px-3 py-3 text-soft sm:table-cell md:px-4">{getNetwork(h.networkId)?.name}</td>
                      <td className="num px-3 py-3 font-semibold md:px-4">{priceUsd(h.priceUsd)}</td>
                      <td className="num hidden px-3 py-3 md:table-cell md:px-4">{usdCompact(h.liquidityUsd)}</td>
                      <td className="px-3 py-3 text-right md:px-4">
                        <span className="flex flex-col items-end gap-1">
                          <span className={`num font-semibold ${r === null ? "text-muted" : r >= 0 ? "text-up" : "text-down"}`}>{r === null ? (`${hitKey(h)}|${range}` in series ? "No data" : "Loading") : `${r >= 0 ? "+" : ""}${r.toFixed(1)}%`}</span>
                          {best === i && <span className="badge badge-up"><Trophy size={11} aria-hidden="true" /> Best</span>}
                          {worst === i && <span className="badge badge-down"><TrendingDown size={11} aria-hidden="true" /> Worst</span>}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
