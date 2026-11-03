"use client";

import { Plus, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { getNetwork } from "@/lib/market-data/networks";
import { priceUsd, usdCompact } from "@/lib/utils/format";

interface Hit { networkId: string; address: string; name: string; symbol: string; imageUrl: string | null; priceUsd: number | null; liquidityUsd: number | null; poolAddress: string }
const COLORS = ["#ff5a3c", "#5cc8ff", "#ffd24a"] as const;
const MAX = 3;
const W = 640;
const H = 260;

/** Overlays the last 7 days of up to three tokens, rebased to percent change from the start of the window. */
export function CompareView() {
  const params = useSearchParams();
  const [picked, setPicked] = useState<Hit[]>([]);
  const [series, setSeries] = useState<Record<string, number[] | null>>({});
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);

  useEffect(() => {
    const a = params.get("a");
    if (!a || picked.length > 0) return;
    const [net, addr] = [a.slice(0, a.indexOf(":")), decodeURIComponent(a.slice(a.indexOf(":") + 1))];
    void fetch(`/api/search?q=${encodeURIComponent(addr)}`).then((r) => r.json()).then((j: { results?: Hit[] }) => {
      const m = (j.results ?? []).find((h) => h.networkId === net) ?? j.results?.[0];
      if (m) setPicked([m]);
    }).catch(() => undefined);
  }, [params, picked.length]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(q.trim())}`).then((r) => r.json()).then((j: { results?: Hit[] }) => setHits(j.results ?? [])).catch(() => setHits([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    for (const h of picked) {
      const key = `${h.networkId}:${h.address}`;
      if (key in series) continue;
      void fetch(`/api/spark?network=${h.networkId}&pool=${encodeURIComponent(h.poolAddress)}`).then((r) => (r.ok ? r.json() : null)).then((j: { points: number[] } | null) => setSeries((s) => ({ ...s, [key]: j && j.points.length > 3 ? j.points : null }))).catch(() => setSeries((s) => ({ ...s, [key]: null })));
    }
  }, [picked, series]);

  const lines = useMemo(() => {
    const rebased = picked.map((h) => {
      const p = series[`${h.networkId}:${h.address}`];
      return p ? p.map((v) => ((v - (p[0] ?? v)) / (p[0] ?? v)) * 100) : null;
    });
    const all = rebased.flat().filter((v): v is number => v !== null);
    const lo = Math.min(0, ...all);
    const hi = Math.max(0, ...all);
    const span = hi - lo || 1;
    return { lo, hi, paths: rebased.map((r) => (r ? r.map((v, i) => `${i ? "L" : "M"}${((i / (r.length - 1)) * W).toFixed(1)},${(H - ((v - lo) / span) * H).toFixed(1)}`).join(" ") : null)), zero: H - ((0 - lo) / span) * H, last: rebased.map((r) => (r ? (r.at(-1) ?? null) : null)) };
  }, [picked, series]);

  const add = (h: Hit) => {
    if (picked.length >= MAX || picked.some((p) => p.networkId === h.networkId && p.address === h.address)) return;
    setPicked([...picked, h]);
    setHits([]);
    setQ("");
  };

  return (
    <div className="space-y-5">
      <div className="card space-y-3 p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {picked.map((h, i) => (
            <span key={`${h.networkId}:${h.address}`} className="chip" style={{ borderColor: COLORS[i] }}>
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} /> {h.symbol}
              <button type="button" aria-label={`Remove ${h.symbol}`} onClick={() => setPicked(picked.filter((_, n) => n !== i))}><X size={13} /></button>
            </span>
          ))}
          {picked.length < MAX && (
            <div className="relative min-w-[220px] flex-1">
              <Plus size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input className="input !pl-9" placeholder={picked.length ? "Add another token" : "Search a token to compare"} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Add a token" autoComplete="off" />
              {hits.length > 0 && q.trim().length >= 2 && (
                <ul className="glass-float absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-y-auto !bg-[var(--surface-2)] py-1">
                  {hits.map((h) => (
                    <li key={`${h.networkId}:${h.address}`}>
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
      </div>

      {picked.length === 0 ? (
        <EmptyState title="Pick up to three tokens" description="Search above. You will see their last 7 days on one chart, rebased so you can compare moves fairly." />
      ) : (
        <>
          <div className="card p-4 md:p-5">
            <h2 className="h3 mb-3">Last 7 days, change from start</h2>
            <svg viewBox={`0 0 ${W} ${H + 8}`} className="h-auto w-full" role="img" aria-label="Seven day percent change for the selected tokens">
              <line x1="0" x2={W} y1={lines.zero} y2={lines.zero} stroke="var(--line-2)" strokeDasharray="4 4" />
              {lines.paths.map((d, i) => d && <path key={i} d={d} fill="none" stroke={COLORS[i]} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="spark-draw-line" />)}
            </svg>
            <p className="mt-2 text-xs text-muted">Axis runs from {lines.lo.toFixed(0)}% to {lines.hi.toFixed(0)}%. Source GeckoTerminal pool candles. A token with no candles shows no line.</p>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted"><th className="px-4 py-3">Token</th><th className="px-4 py-3">Network</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Liquidity</th><th className="px-4 py-3">7d</th></tr></thead>
              <tbody>
                {picked.map((h, i) => (
                  <tr key={`${h.networkId}:${h.address}`} className="border-b border-line last:border-0">
                    <td className="px-4 py-3"><span className="flex items-center gap-2.5 font-semibold"><i className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} /><TokenLogo src={h.imageUrl} symbol={h.symbol} size={26} networkId={h.networkId} address={h.address} />{h.symbol}</span></td>
                    <td className="px-4 py-3 text-soft">{getNetwork(h.networkId)?.name}</td>
                    <td className="num px-4 py-3 font-semibold">{priceUsd(h.priceUsd)}</td>
                    <td className="num px-4 py-3">{usdCompact(h.liquidityUsd)}</td>
                    <td className={`num px-4 py-3 font-semibold ${lines.last[i] === null ? "text-muted" : (lines.last[i] ?? 0) >= 0 ? "text-up" : "text-down"}`}>{lines.last[i] === null ? "No data" : `${(lines.last[i] ?? 0) >= 0 ? "+" : ""}${(lines.last[i] ?? 0).toFixed(1)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
