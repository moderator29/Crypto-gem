"use client";

import { AreaSeries, CandlestickSeries, ColorType, HistogramSeries, createChart, type IChartApi, type UTCTimestamp } from "lightweight-charts";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Candle } from "@/lib/market-data/types";

const FRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
/** Quick ranges map to a sensible candle size, so one tap shows the window the label promises. */
const RANGES = [{ id: "1H", tf: "1m" }, { id: "1D", tf: "15m" }, { id: "1W", tf: "1h" }, { id: "1M", tf: "4h" }, { id: "1Y", tf: "1d" }] as const;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function PriceChart({ networkId, pool }: { networkId: string; pool: string }) {
  const el = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [tf, setTf] = useState<(typeof FRAMES)[number]>("1h");
  const [state, setState] = useState<"loading" | "ok" | "empty" | "error">("loading");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [tick, setTick] = useState(0);
  const [kind, setKind] = useState<"candles" | "line">("candles");

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/ohlcv?network=${networkId}&pool=${encodeURIComponent(pool)}&tf=${tf}`, { signal: ctrl.signal })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        const list = j.candles as Candle[];
        setCandles(list);
        setState(list.length ? "ok" : "empty");
      })
      .catch((e: Error) => e.name !== "AbortError" && setState("error"));
    return () => ctrl.abort();
  }, [networkId, pool, tf, tick]);

  useEffect(() => {
    if (state !== "ok" || !el.current) return;
    const text = cssVar("--text-muted");
    const up = cssVar("--up");
    const down = cssVar("--down");
    const chart = createChart(el.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: text, fontFamily: "inherit" },
      grid: { vertLines: { color: "transparent" }, horzLines: { color: cssVar("--border") } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      crosshair: { mode: 0 },
    });
    chartRef.current = chart;
    const priceFormat = { type: "price" as const, precision: 8, minMove: 0.00000001 };
    if (kind === "line") {
      const first = candles[0]?.close ?? 0;
      const last = candles.at(-1)?.close ?? 0;
      const tone = last >= first ? up : down;
      const area = chart.addSeries(AreaSeries, { lineColor: tone, topColor: `${tone}55`, bottomColor: `${tone}00`, lineWidth: 2, priceFormat });
      area.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })));
    } else {
      const price = chart.addSeries(CandlestickSeries, { upColor: up, downColor: down, wickUpColor: up, wickDownColor: down, borderVisible: false, priceFormat });
      price.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close })));
    }
    const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol" });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    vol.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.volume, color: c.close >= c.open ? `${up}55` : `${down}55` })));
    chart.timeScale().fitContent();
    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [state, candles, kind]);

  return (
    <div className="card p-3 md:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="scroll-x" role="group" aria-label="Range">
          {RANGES.map((r) => (
            <button key={r.id} type="button" className="chip !min-h-9" aria-pressed={tf === r.tf} onClick={() => { setTf(r.tf); setState("loading"); }}>
              {r.id}
            </button>
          ))}
          <span className="mx-1 w-px self-stretch bg-[var(--line-2)]" aria-hidden="true" />
          {FRAMES.map((f) => (
            <button key={f} type="button" className="chip !min-h-9" aria-pressed={tf === f} onClick={() => { setTf(f); setState("loading"); }}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
        <div className="flex" role="group" aria-label="Chart type">
          {(["candles", "line"] as const).map((k) => <button key={k} type="button" className="chip !min-h-9 capitalize" aria-pressed={kind === k} onClick={() => setKind(k)}>{k}</button>)}
        </div>
        <button type="button" className="btn btn-sm btn-icon shrink-0" aria-label="Refresh chart" onClick={() => { setTick((t) => t + 1); setState("loading"); }}>
          <RefreshCw size={15} />
        </button>
        </div>
      </div>
      <div className="relative h-[320px] md:h-[420px]">
        {state === "loading" && <div className="skeleton absolute inset-0" />}
        {state === "empty" && <p className="grid h-full place-items-center text-sm text-muted">No candles for this timeframe yet.</p>}
        {state === "error" && <p className="grid h-full place-items-center text-center text-sm text-down">Chart data is unavailable right now. Try refreshing in a minute.</p>}
        <div ref={el} className={state === "ok" ? "h-full w-full" : "hidden"} />
      </div>
      <p className="mt-2 text-[11px] text-muted">Candles: GeckoTerminal, pool-level DEX data. Lightweight Charts by TradingView.</p>
    </div>
  );
}
