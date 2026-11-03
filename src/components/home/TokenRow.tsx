"use client";

import { ChainBadge } from "@/components/ui/ChainBadge";

import { ChevronDown, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { getNetwork } from "@/lib/market-data/networks";
import type { PoolSummary } from "@/lib/market-data/types";
import { ageShort, pct, priceUsd, usdCompact } from "@/lib/utils/format";
import { ROW_COLS } from "./rowCols";

export { ROW_COLS };

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
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prev = useRef(pool.priceUsd);
  // Live feel: when a refresh changes the price, flash the cell green or red once.
  useEffect(() => {
    const before = prev.current;
    prev.current = pool.priceUsd;
    if (before === null || pool.priceUsd === null || before === pool.priceUsd) return;
    const dir = pool.priceUsd > before ? "up" : "down";
    const start = setTimeout(() => setFlash(dir), 0);
    const end = setTimeout(() => setFlash(null), 1100);
    return () => {
      clearTimeout(start);
      clearTimeout(end);
    };
  }, [pool.priceUsd]);
  const t = pool.baseToken;
  const net = getNetwork(pool.networkId);
  const panelId = `row-${pool.id.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div className="overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={`grid w-full items-center gap-x-3 px-3.5 py-3 text-left transition  ${ROW_COLS}`}
      >
        {rank !== undefined && <span className="num hidden text-sm font-bold text-muted md:block">{rank}</span>}
        <span className="flex min-w-0 items-center gap-3">
          <span className="relative shrink-0">
            <TokenLogo src={t.imageUrl} symbol={t.symbol} size={44} networkId={pool.networkId} address={t.address} />
            <span className="absolute -bottom-1 -right-1 rounded ring-2 ring-[var(--surface-1)]"><ChainBadge networkId={pool.networkId} size={18} /></span>
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold leading-tight">{t.name || t.symbol}</span>
            <span className="block truncate text-xs text-muted">
              {t.symbol}
              {note ? ` · ${note}` : ""}
            </span>
          </span>
        </span>
        <span className="num text-right md:text-left">
          <span className={`block rounded font-semibold ${flash === "up" ? "flash-up" : flash === "down" ? "flash-down" : ""}`}>{priceUsd(pool.priceUsd)}</span>
          <span className="block text-xs md:hidden">
            <Change v={pool.change.h24} />
          </span>
        </span>
        <span className="num hidden text-sm lg:block"><Change v={pool.change.h1} /></span>
        <span className="num hidden text-sm md:block"><Change v={pool.change.h24} /></span>
        <span className="num hidden text-sm md:block">{usdCompact(pool.volumeUsd.h24)}</span>
        <span className="num hidden text-sm lg:block">{usdCompact(pool.liquidityUsd)}</span>
        <span className="num hidden text-right text-xs text-muted lg:block">{ageShort(pool.createdAt)}</span>
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
