"use client";

import { AreaSeries, CandlestickSeries, ColorType, CrosshairMode, HistogramSeries, LineSeries, createChart, type UTCTimestamp } from "lightweight-charts";
import { Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { candleChangePct, ema, mapMc, sma, toLineData } from "@/lib/market-data/token-extras";
import type { Candle } from "@/lib/market-data/types";
import { priceUsd, usdCompact } from "@/lib/utils/format";

const FRAMES = [
  { id: "1m", label: "1m" },
  { id: "5m", label: "5m" },
  { id: "15m", label: "15m" },
  { id: "1h", label: "1H" },
  { id: "4h", label: "4H" },
  { id: "1d", label: "1D" },
] as const;
type Frame = (typeof FRAMES)[number]["id"];
type Mode = "price" | "mc";
type Kind = "candles" | "line";

const EMA_COLOR = "#f5b301";
const MA_COLOR = "#5b8def";

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Axis labels: full precision for tiny prices, compact dollars for market cap. */
function axisFormat(mode: Mode, v: number): string {
  return mode === "mc" ? usdCompact(v) : priceUsd(v);
}

const fmtVol = (v: number) => usdCompact(v);

/**
 * Candle chart for a pool. Candles come from GeckoTerminal through /api/ohlcv and refresh every 30 seconds while the
 * tab is visible. The Price/MC toggle scales candles by the current fdv to price ratio, so MC mode is an estimate that
 * assumes today's supply for every candle. EMA 20 and MA 20 are computed here from the candles on screen.
 */
export function PriceChart({ networkId, pool, fdvRatio = null }: { networkId: string; pool: string; fdvRatio?: number | null }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [tf, setTf] = useState<Frame>("1h");
  const [state, setState] = useState<"loading" | "ok" | "empty" | "error">("loading");
  const [raw, setRaw] = useState<Candle[]>([]);
  const [tick, setTick] = useState(0);
  const [theme, setTheme] = useState(0);
  const [kind, setKind] = useState<Kind>("candles");
  const [mode, setMode] = useState<Mode>("price");
  const [showVol, setShowVol] = useState(true);
  const [showEma, setShowEma] = useState(false);
  const [showMa, setShowMa] = useState(false);
  const [full, setFull] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  const mcOk = typeof fdvRatio === "number" && Number.isFinite(fdvRatio) && fdvRatio > 0;
  const effMode: Mode = mode === "mc" && mcOk ? "mc" : "price";
  const candles = useMemo(() => (effMode === "mc" && fdvRatio ? mapMc(raw, fdvRatio) : raw), [raw, effMode, fdvRatio]);
  const byTime = useMemo(() => new Map(candles.map((c) => [c.time, c])), [candles]);
  const closes = useMemo(() => candles.map((c) => c.close), [candles]);
  const emaVals = useMemo(() => ema(closes, 20), [closes]);
  const maVals = useMemo(() => sma(closes, 20), [closes]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/ohlcv?network=${networkId}&pool=${encodeURIComponent(pool)}&tf=${tf}`, { signal: ctrl.signal })
      .then(async (r) => {
        const j = (await r.json()) as { candles?: Candle[]; error?: string };
        if (!r.ok || !j.candles) throw new Error(j.error ?? "failed");
        setRaw(j.candles);
        setState(j.candles.length ? "ok" : "empty");
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setState((s) => (s === "ok" ? s : "error"));
      });
    return () => ctrl.abort();
  }, [networkId, pool, tf, tick]);

  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const mo = new MutationObserver(() => setTheme((t) => t + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [full]);

  useEffect(() => {
    if (state !== "ok" || !host || candles.length === 0) return;
    const up = cssVar("--up") || "#10b981";
    const down = cssVar("--down") || "#f43f5e";
    const chart = createChart(host, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: cssVar("--text-muted"), fontFamily: "inherit", attributionLogo: false },
      grid: { vertLines: { color: "transparent" }, horzLines: { color: cssVar("--line-1") || "rgba(255,255,255,0.07)" } },
      rightPriceScale: { borderVisible: false, minimumWidth: 64 },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
      localization: { priceFormatter: (v: number) => axisFormat(effMode, v) },
    });
    const priceFormat = { type: "custom" as const, formatter: (v: number) => axisFormat(effMode, v), minMove: effMode === "mc" ? 1 : 1e-10 };
    if (kind === "line") {
      const tone = (candles.at(-1)?.close ?? 0) >= (candles[0]?.close ?? 0) ? up : down;
      const area = chart.addSeries(AreaSeries, { lineColor: tone, topColor: `${tone}55`, bottomColor: `${tone}00`, lineWidth: 2, priceFormat });
      area.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })));
    } else {
      const s = chart.addSeries(CandlestickSeries, { upColor: up, downColor: down, wickUpColor: up, wickDownColor: down, borderVisible: false, priceFormat });
      s.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close })));
    }
    if (showEma) {
      const l = chart.addSeries(LineSeries, { color: EMA_COLOR, lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, priceFormat });
      l.setData(toLineData(candles, emaVals).map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    }
    if (showMa) {
      const l = chart.addSeries(LineSeries, { color: MA_COLOR, lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, priceFormat });
      l.setData(toLineData(candles, maVals).map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    }
    if (showVol) {
      const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol", priceLineVisible: false, lastValueVisible: false });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      vol.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.volume, color: c.close >= c.open ? `${up}55` : `${down}55` })));
    }
    chart.timeScale().fitContent();
    chart.subscribeCrosshairMove((p) => setHover(typeof p.time === "number" ? p.time : null));
    return () => chart.remove();
  }, [state, host, candles, kind, effMode, showVol, showEma, showMa, emaVals, maVals, theme]);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const shown = (hover !== null ? byTime.get(hover) : undefined) ?? candles.at(-1);
  const idx = shown ? candles.findIndex((c) => c.time === shown.time) : -1;
  const chg = shown ? candleChangePct(shown) : null;
  const up = (chg ?? 0) >= 0;
  const tone = up ? "text-up" : "text-down";

  return (
    <section className={full ? "tk-chart-full" : "card p-3 md:p-4"} aria-label="Price chart">
      <div className="scroll-x mb-2" role="group" aria-label="Timeframe">
        {FRAMES.map((f) => (
          <button key={f.id} type="button" className="chip !min-h-9 !px-3.5" aria-pressed={tf === f.id} onClick={() => { setTf(f.id); setState("loading"); }}>
            {f.label}
          </button>
        ))}
        <span className="mx-1 w-px shrink-0 self-stretch bg-[var(--line-2)]" aria-hidden="true" />
        <div className="flex shrink-0 gap-2" role="group" aria-label="Value shown">
          <button type="button" className="chip !min-h-9 !px-3.5" aria-pressed={effMode === "price"} onClick={() => setMode("price")}>Price</button>
          <button type="button" className="chip !min-h-9 !px-3.5" aria-pressed={effMode === "mc"} disabled={!mcOk} title={mcOk ? "Estimated market cap" : "Market cap needs a known fully diluted value"} onClick={() => setMode("mc")}>MC</button>
        </div>
      </div>
      <div className="scroll-x mb-2" role="group" aria-label="Chart options">
        <div className="flex shrink-0 gap-2" role="group" aria-label="Chart type">
          {(["candles", "line"] as const).map((k) => <button key={k} type="button" className="chip !min-h-8 !px-3 capitalize" aria-pressed={kind === k} onClick={() => setKind(k)}>{k}</button>)}
        </div>
        <span className="mx-1 w-px shrink-0 self-stretch bg-[var(--line-2)]" aria-hidden="true" />
        <button type="button" className="chip !min-h-8 !px-3" aria-pressed={showVol} onClick={() => setShowVol((v) => !v)}>Volume</button>
        <button type="button" className="chip !min-h-8 !px-3" aria-pressed={showEma} onClick={() => setShowEma((v) => !v)}><span className="tk-dot" style={{ background: EMA_COLOR }} aria-hidden="true" />EMA 20</button>
        <button type="button" className="chip !min-h-8 !px-3" aria-pressed={showMa} onClick={() => setShowMa((v) => !v)}><span className="tk-dot" style={{ background: MA_COLOR }} aria-hidden="true" />MA 20</button>
        <span className="mx-1 w-px shrink-0 self-stretch bg-[var(--line-2)]" aria-hidden="true" />
        <button type="button" className="btn btn-sm btn-icon shrink-0" aria-label="Refresh chart" onClick={refresh}><RefreshCw size={15} /></button>
        <button type="button" className="btn btn-sm btn-icon shrink-0" aria-label={full ? "Exit full screen" : "Full screen"} aria-pressed={full} onClick={() => setFull((f) => !f)}>
          {full ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>

      <div className="tk-ohlc num" aria-live="off">
        {shown && state === "ok" ? (
          <>
            <span className="tk-ohlc-k">O</span><span>{axisFormat(effMode, shown.open)}</span>
            <span className="tk-ohlc-k">H</span><span>{axisFormat(effMode, shown.high)}</span>
            <span className="tk-ohlc-k">L</span><span>{axisFormat(effMode, shown.low)}</span>
            <span className="tk-ohlc-k">C</span><span className={tone}>{axisFormat(effMode, shown.close)}</span>
            <span className="tk-ohlc-k">V</span><span>{fmtVol(shown.volume)}</span>
            <span className={`font-semibold ${tone}`}>{chg === null ? "—" : `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%`}</span>
            {showEma && idx >= 0 && emaVals[idx] !== null && <span style={{ color: EMA_COLOR }}>EMA {axisFormat(effMode, emaVals[idx] as number)}</span>}
            {showMa && idx >= 0 && maVals[idx] !== null && <span style={{ color: MA_COLOR }}>MA {axisFormat(effMode, maVals[idx] as number)}</span>}
          </>
        ) : (
          <span className="text-muted">Move over the chart to read a candle.</span>
        )}
      </div>

      <div className={`relative ${full ? "min-h-0 flex-1" : "h-[320px] md:h-[420px]"}`}>
        {state === "loading" && <div className="skeleton absolute inset-0" />}
        {state === "empty" && <p className="grid h-full place-items-center text-sm text-muted">No candles for this timeframe yet.</p>}
        {state === "error" && <p className="grid h-full place-items-center px-4 text-center text-sm text-down">Chart data is unavailable right now. Try refreshing in a minute.</p>}
        <div ref={setHost} className={state === "ok" ? "h-full w-full" : "hidden"} />
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {effMode === "mc" ? "Estimated MC using current supply. Past candles assume today's supply, so history is approximate. " : ""}
        Candles: GeckoTerminal, pool-level DEX data. Lightweight Charts by TradingView.
      </p>
    </section>
  );
}
