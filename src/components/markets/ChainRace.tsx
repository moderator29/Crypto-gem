"use client";

import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { ChainBadge } from "@/components/ui/ChainBadge";
import { METRIC_LABEL, rankChains, type ChainMetric } from "@/lib/market-data/analytics";
import type { ChainPulse } from "@/lib/market-data/pulse";
import { usdCompact } from "@/lib/utils/format";

const METRICS: ChainMetric[] = ["volume", "liquidity", "newPools", "buySell"];

function formatValue(m: ChainMetric, v: number): string {
  if (m === "volume" || m === "liquidity") return usdCompact(v);
  if (m === "buySell") return `${v.toFixed(2)}x`;
  return String(Math.round(v));
}

/** Animated horizontal bar race. Bars grow in, and rows glide to their new rank when the metric changes. */
export function ChainRace({ chains }: { chains: ChainPulse[] }) {
  const [metric, setMetric] = useState<ChainMetric>("volume");
  const reduce = useReducedMotion();
  const rows = rankChains(chains, metric, 10);
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 320, damping: 34 };

  return (
    <div className="card p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="h3">Chain race</h3>
          <p className="text-xs text-muted">Top chains by {METRIC_LABEL[metric].toLowerCase()} in the pools we sample</p>
        </div>
        <div role="radiogroup" aria-label="Race metric" className="mk-seg max-w-full overflow-x-auto">
          {METRICS.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={metric === m} className="mk-seg-btn shrink-0" onClick={() => setMetric(m)}>{METRIC_LABEL[m]}</button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No chain has a measurable {METRIC_LABEL[metric].toLowerCase()} in this sample.</p>
      ) : (
        <LayoutGroup>
          <ol className="mt-4 space-y-2" aria-live="polite">
            {rows.map((r) => (
              <motion.li key={r.networkId} layout transition={spring}>
                <Link href={`/chains/${r.networkId}`} className="mk-race-row group">
                  <span className="num w-5 shrink-0 text-right text-xs text-muted">{r.rank}</span>
                  <ChainBadge networkId={r.networkId} size={22} />
                  <span className="w-[72px] shrink-0 truncate text-sm font-semibold sm:w-28">{r.name}</span>
                  <span className="mk-race-track">
                    <motion.span className="mk-race-bar" initial={{ width: reduce ? `${r.share * 100}%` : "0%" }} animate={{ width: `${Math.max(3, r.share * 100)}%` }} transition={reduce ? { duration: 0 } : { duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
                  </span>
                  <span className="num w-16 shrink-0 text-right text-sm font-bold">{formatValue(metric, r.value)}</span>
                </Link>
              </motion.li>
            ))}
          </ol>
        </LayoutGroup>
      )}
    </div>
  );
}
