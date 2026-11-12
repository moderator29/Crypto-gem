import Link from "next/link";
import { chainColor, volumeShares } from "@/lib/market-data/analytics";
import type { ChainPulse } from "@/lib/market-data/pulse";

/** One stacked bar of each chain's share of the sampled 24h volume. Each segment links to its chain. */
export function VolumeShareBar({ chains }: { chains: ChainPulse[] }) {
  const shares = volumeShares(chains, 6);
  if (shares.length === 0) return null;
  return (
    <section className="card space-y-3 p-4" aria-label="Share of sampled volume">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="h3">Where the volume is</h2>
        <p className="text-xs text-muted">Share of 24h volume in the pools we sample</p>
      </div>
      <div className="mk-share-bar" role="img" aria-label={shares.map((s) => `${s.name} ${(s.share * 100).toFixed(0)} percent`).join(", ")}>
        {shares.map((s) => <span key={s.networkId} style={{ width: `${s.share * 100}%`, background: s.networkId === "other" ? "var(--text-muted)" : chainColor(s.networkId) }} />)}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {shares.map((s) => {
          const dot = <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.networkId === "other" ? "var(--text-muted)" : chainColor(s.networkId) }} />;
          const inner = <>{dot}<span className="font-semibold">{s.name}</span><span className="num text-muted">{(s.share * 100).toFixed(s.share < 0.1 ? 1 : 0)}%</span></>;
          return <li key={s.networkId}>{s.networkId === "other" ? <span className="flex items-center gap-1.5">{inner}</span> : <Link href={`/chains/${s.networkId}`} className="flex items-center gap-1.5 hover:text-brand">{inner}</Link>}</li>;
        })}
      </ul>
    </section>
  );
}
