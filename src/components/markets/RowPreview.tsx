"use client";

import { createPortal } from "react-dom";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { getNetwork } from "@/lib/market-data/networks";
import type { PoolSummary } from "@/lib/market-data/types";
import { ageShort, pct, priceUsd, usdCompact } from "@/lib/utils/format";
import { Sparkline } from "./Sparkline";

export interface PreviewAt { pool: PoolSummary; x: number; top: number; bottom: number }

const WIDTH = 288;
const HEIGHT = 238;

/** Hover card for a table row: a larger real 7 day trend plus liquidity and volume. Mouse only, never intercepts clicks. */
export function RowPreview({ at }: { at: PreviewAt }) {
  const p = at.pool;
  const t = p.baseToken;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.max(12, Math.min(vw - WIDTH - 12, at.x - WIDTH / 2));
  const below = at.bottom + HEIGHT + 12 < vh;
  const top = below ? at.bottom + 8 : Math.max(8, at.top - HEIGHT - 8);
  const stats: Array<[string, string]> = [["Liquidity", usdCompact(p.liquidityUsd)], ["24h volume", usdCompact(p.volumeUsd.h24)], ["1h", pct(p.change.h1)], ["24h", pct(p.change.h24)], ["Age", ageShort(p.createdAt)], ["Network", getNetwork(p.networkId)?.name ?? p.networkId]];
  return createPortal(
    <div className="mk-preview glass-float" style={{ left, top }} aria-hidden="true">
      <div className="flex items-center gap-2.5">
        <TokenLogo src={t.imageUrl} symbol={t.symbol} size={30} networkId={p.networkId} address={t.address} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight">{t.name || t.symbol}</p>
          <p className="truncate text-[11px] uppercase text-muted">{t.symbol}</p>
        </div>
        <span className="num text-sm font-bold">{priceUsd(p.priceUsd)}</span>
      </div>
      <div className="mt-3 flex min-h-[76px] items-center justify-center rounded-lg bg-[var(--surface-2)] p-1.5">
        <Sparkline key={p.id} network={p.networkId} pool={p.address} width={256} height={72} />
      </div>
      <p className="mt-1 text-[10px] text-muted">7 day trend from pool candles</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {stats.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-2"><dt className="text-muted">{k}</dt><dd className="num truncate font-semibold">{v}</dd></div>
        ))}
      </dl>
    </div>,
    document.body,
  );
}
