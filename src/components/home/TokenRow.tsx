"use client";

import { ChevronDown, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { getNetwork } from "@/lib/market-data/networks";
import type { PoolSummary } from "@/lib/market-data/types";
import { ageShort, pct, priceUsd, usdCompact } from "@/lib/utils/format";

export function Change({ v }: { v: number | null }) {
  return <span className={`num font-semibold ${v === null ? "text-muted" : v >= 0 ? "text-up" : "text-down"}`}>{pct(v)}</span>;
}

function Detail({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <dt className="text-muted">{k}</dt>
      <dd className="num text-right font-semibold">{children}</dd>
    </div>
  );
}

/**
 * Two-line row on mobile, table row on desktop. Tapping expands an inline
 * detail panel instead of navigating, so users can scan many tokens quickly.
 */
export function TokenRow({ pool, rank, note }: { pool: PoolSummary; rank?: number; note?: string }) {
  const [open, setOpen] = useState(false);
  const t = pool.baseToken;
  const net = getNetwork(pool.networkId);
  const panelId = `row-${pool.id.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div className="glass-flat overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 px-3.5 py-3 text-left transition hover:bg-[var(--border)] md:grid-cols-[32px_minmax(0,2fr)_1fr_1fr_1fr_1fr_56px_20px]"
      >
        {rank !== undefined && <span className="num hidden text-sm font-bold text-muted md:block">{rank}</span>}
        <span className="relative">
          <TokenLogo src={t.imageUrl} symbol={t.symbol} size={44} />
          <span className="absolute -bottom-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full border border-line bg-[var(--surface-solid)] px-1 text-[8px] font-bold uppercase text-soft" title={net?.name}>
            {(net?.name ?? pool.networkId).slice(0, 3)}
          </span>
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold leading-tight">{t.name || t.symbol}</span>
          <span className="block truncate text-xs text-muted">
            {t.symbol}
            {note ? ` · ${note}` : ""}
          </span>
        </span>
        <span className="num text-right md:text-left">
          <span className="block font-semibold">{priceUsd(pool.priceUsd)}</span>
          <span className="block text-xs md:hidden">
            <Change v={pool.change.h24} />
          </span>
        </span>
        <span className="num hidden text-sm md:block">
          <Change v={pool.change.h1} /> <span className="text-xs text-muted">1h</span>
        </span>
        <span className="num hidden text-sm md:block">
          <Change v={pool.change.h24} /> <span className="text-xs text-muted">24h</span>
        </span>
        <span className="num hidden text-sm md:block">{usdCompact(pool.volumeUsd.h24)}</span>
        <span className="num hidden text-sm md:block">{usdCompact(pool.liquidityUsd)}</span>
        <span className="num hidden text-right text-xs text-muted md:block">{ageShort(pool.createdAt)}</span>
        <ChevronDown size={18} className={`text-muted transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="border-t border-line px-4 pb-4 pt-2">
          <dl className="divide-y divide-[var(--border)]">
            <Detail k="Network">{net?.name ?? pool.networkId}</Detail>
            <Detail k="Change 1h">
              <Change v={pool.change.h1} />
            </Detail>
            <Detail k="Change 24h">
              <Change v={pool.change.h24} />
            </Detail>
            <Detail k="Volume 24h">{usdCompact(pool.volumeUsd.h24)}</Detail>
            <Detail k="Liquidity">{usdCompact(pool.liquidityUsd)}</Detail>
            <Detail k="Market cap">{usdCompact(pool.marketCapUsd)}</Detail>
            <Detail k="FDV">{usdCompact(pool.fdvUsd)}</Detail>
            <Detail k="Pool age">{ageShort(pool.createdAt)}</Detail>
            <Detail k="DEX">{pool.dex ? pool.dex.replace(/-/g, " ") : "—"}</Detail>
          </dl>
          <Link href={`/token/${pool.networkId}/${t.address}`} className="btn btn-primary mt-3 w-full">
            Open token <ExternalLink size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
