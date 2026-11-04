import { Activity, Layers, Sparkles, Waves } from "lucide-react";
import { CountUp } from "@/components/fx/CountUp";
import { ChainBadge } from "@/components/ui/ChainBadge";
import { Stat } from "@/components/ui/Kit";
import type { HomeData } from "@/lib/market-data/home";
import type { ChainPulse } from "@/lib/market-data/pulse";
import type { FearGreed } from "@/lib/market-data/providers/fng";


/** Half-circle gauge for a 0 to 100 index. The needle sweeps in on load. */
function Gauge({ value, label }: { value: number; label: string }) {
  const angle = -90 + (value / 100) * 180;
  const tone = value < 25 ? "var(--down)" : value < 45 ? "var(--warm)" : value < 56 ? "var(--text-soft)" : "var(--up)";
  return (
    <svg viewBox="0 0 200 118" className="mx-auto w-full max-w-[220px]" role="img" aria-label={`Fear and Greed index ${value}, ${label}`}>
      <defs>
        <linearGradient id="fng-g" x1="0" x2="1">
          <stop offset="0" stopColor="var(--down)" />
          <stop offset="0.5" stopColor="var(--warm)" />
          <stop offset="1" stopColor="var(--up)" />
        </linearGradient>
      </defs>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--surface-3)" strokeWidth="14" strokeLinecap="round" />
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#fng-g)" strokeWidth="14" strokeLinecap="round" strokeDasharray="251" strokeDashoffset={251 - (value / 100) * 251} className="fx-gauge" />
      <g style={{ transformOrigin: "100px 100px", transform: `rotate(${angle}deg)` }} className="fx-needle">
        <line x1="100" y1="100" x2="100" y2="38" stroke={tone} strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="100" r="6" fill={tone} />
      </g>
      <text x="100" y="86" textAnchor="middle" className="num" fontSize="26" fontWeight="700" fill="var(--text)">{value}</text>
    </svg>
  );
}

/** Donut of 24h volume share by chain, drawn with stroke segments. Colours come from a fixed brand-friendly ramp. */
function Donut({ chains }: { chains: ChainPulse[] }) {
  const top = [...chains].sort((a, b) => b.volume24hUsd - a.volume24hUsd).slice(0, 5);
  const total = chains.reduce((s, c) => s + c.volume24hUsd, 0);
  if (total <= 0 || top.length === 0) return <p className="text-sm text-muted">No volume measured yet.</p>;
  const COLORS = ["var(--brand)", "var(--brand-2)", "var(--warm)", "var(--up)", "#8b7bff"];
  const R = 38;
  const C = 2 * Math.PI * R;
  const starts = top.reduce<number[]>((acc, c, i) => [...acc, (acc[i] ?? 0) + (c.volume24hUsd / total) * C], [0]);
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90" role="img" aria-label="24 hour volume share by chain">
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="12" />
        {top.map((c, i) => {
          const len = (c.volume24hUsd / total) * C;
          return <circle key={c.networkId} cx="50" cy="50" r={R} fill="none" stroke={COLORS[i]} strokeWidth="12" strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`} strokeDashoffset={-(starts[i] ?? 0)} className="fx-donut" style={{ animationDelay: `${i * 90}ms` }} />;
        })}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {top.map((c, i) => (
          <li key={c.networkId} className="flex items-center gap-2">
            <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[i] }} />
            <ChainBadge networkId={c.networkId} size={16} />
            <span className="min-w-0 flex-1 truncate">{c.name}</span>
            <span className="num text-xs text-muted">{Math.round((c.volume24hUsd / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Measured read on the market right now: counts, sentiment and where volume sits. Every figure is labelled with its source. */
export function PulseStrip({ data, chains, fng }: { data: HomeData; chains: ChainPulse[]; fng: FearGreed | null }) {
  const pools = [...new Map([...data.organic, ...data.fresh, ...data.volume].map((p) => [p.id, p])).values()];
  const volume = pools.reduce((s, p) => s + (p.volumeUsd.h24 ?? 0), 0);
  const asOf = Date.parse(data.meta.generatedAt);
  const newDay = pools.filter((p) => p.createdAt && asOf - Date.parse(p.createdAt) < 86_400_000).length;
  const lead = [...chains].sort((a, b) => b.volume24hUsd - a.volume24hUsd)[0];
  const share = lead && volume > 0 ? Math.round((lead.volume24hUsd / chains.reduce((t, c) => t + c.volume24hUsd, 0)) * 100) : null;
  const movers = pools.filter((p) => p.change.h24 !== null);
  const up = movers.filter((p) => (p.change.h24 ?? 0) > 0).length;
  const narrative = lead && share !== null ? `${lead.name} leads sampled 24h volume at ${share}%. ${newDay} new pairs appeared in the last day, and ${up} of ${movers.length} sampled pools are up.` : null;
  return (
    <section aria-label="Market pulse" className="reveal space-y-3">
      {narrative && <p className="card flex items-center gap-3 px-4 py-3 text-sm text-soft"><span className="live-dot shrink-0" aria-hidden="true" />{narrative}</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="24h volume" value={<CountUp value={volume} kind="usd" />} note="Sampled pools" icon={<Waves size={16} aria-hidden="true" />} />
        <Stat label="Pools sampled" value={<CountUp value={pools.length} />} note="Trending, new, top" icon={<Layers size={16} aria-hidden="true" />} />
        <Stat label="New pairs" value={<CountUp value={newDay} />} note="Created in 24h" icon={<Sparkles size={16} aria-hidden="true" />} />
        <Stat label="Active chains" value={<CountUp value={chains.length} />} note="With activity" icon={<Activity size={16} aria-hidden="true" />} />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
        <div className="card p-4">
          <h2 className="eyebrow mb-3 !text-muted">Fear and Greed</h2>
          {fng ? (
            <>
              <Gauge value={fng.value} label={fng.label} />
              <p className="mt-1 text-center text-sm"><span className="font-semibold">{fng.label}</span>{fng.yesterday !== null && <span className="text-muted"> · yesterday {fng.yesterday}</span>}</p>
              <p className="mt-1 text-center text-[11px] text-muted">Source alternative.me. Whole crypto market, not just these pools.</p>
            </>
          ) : <p className="text-sm text-muted">The sentiment index is unavailable right now.</p>}
        </div>
        <div className="card p-4">
          <h2 className="eyebrow mb-3 !text-muted">Where volume sits</h2>
          <Donut chains={chains} />
          <p className="mt-3 text-[11px] text-muted">Share of 24h volume across the pools we sample on each chain. Not the whole market.</p>
        </div>
      </div>
    </section>
  );
}
